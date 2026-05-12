import os
import json
import base64
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from anthropic import Anthropic
from datetime import datetime
from dotenv import load_dotenv
import sheets

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Anthropic()
ACCESS_CODE = os.getenv("ACCESS_CODE", "")


def require_auth(x_access_code: str = Header(...)):
    if ACCESS_CODE and x_access_code != ACCESS_CODE:
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze_tool(
    request: Request,
    photos: List[UploadFile] = File(...),
):
    require_auth(request.headers.get("x-access-code", ""))

    images = []
    for photo in photos[:4]:
        data = await photo.read()
        b64 = base64.standard_b64encode(data).decode("utf-8")
        media_type = photo.content_type or "image/jpeg"
        images.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64}
        })

    content = images + [{
        "type": "text",
        "text": """Analyze this tool/equipment photo for a contractor's warehouse inventory system.

Return a JSON object with these exact fields:
- name: specific tool name (e.g. "Circular Saw", "Pipe Wrench", "4-ft Level")
- brand: manufacturer name (e.g. "DeWalt", "Milwaukee", "Bosch") or "Unknown"
- model: model number/name if visible, else ""
- category: one of "Power Tools", "Hand Tools", "Measuring & Layout", "Electrical", "Plumbing", "Air Tools", "Fastening", "Concrete & Masonry", "Lifting & Material Handling", "Safety Equipment", "Storage & Organization", "Other"
- condition: one of "Excellent", "Good", "Fair", "Poor", "Needs Repair"
- serial_number: serial number if visible on the tool, else ""
- description: 1-2 sentence description noting brand, type, and any visible condition details
- suggested_life_years: estimated useful life in years as an integer (e.g. 10)

Return ONLY valid JSON, no markdown code fences."""
    }]

    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        messages=[{"role": "user", "content": content}]
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]

    analysis = json.loads(text)
    return analysis


@app.post("/api/tools")
async def add_tool(request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    data = await request.json()
    tool_id = sheets.add_tool(data)
    return {"id": tool_id, "status": "added"}


@app.get("/api/tools")
def get_tools(request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    tools = sheets.get_tools()
    return {"tools": tools}


@app.patch("/api/tools/{tool_id}")
async def update_tool(tool_id: str, request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    updates = await request.json()
    sheets.update_tool(tool_id, updates)
    return {"status": "updated"}


@app.patch("/api/tools/{tool_id}/condition")
async def update_condition(tool_id: str, request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    body = await request.json()
    sheets.update_tool(tool_id, {
        "condition": body["condition"],
        "last_used_date": datetime.now().strftime("%Y-%m-%d"),
    })
    return {"status": "updated"}


@app.post("/api/checkouts")
async def checkout_tool(request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    data = await request.json()

    checkout_id = sheets.add_checkout(data)

    tool = sheets.get_tool_by_id(data["tool_id"])
    if tool:
        available = max(0, int(tool.get("quantity_available", 1)) - 1)
        sheets.update_tool(data["tool_id"], {
            "quantity_available": available,
            "last_used_date": datetime.now().strftime("%Y-%m-%d"),
        })

    return {"id": checkout_id, "status": "checked_out"}


@app.patch("/api/checkouts/{checkout_id}/return")
def return_tool(checkout_id: str, request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    checkout = sheets.return_checkout(checkout_id)
    if checkout:
        tool = sheets.get_tool_by_id(checkout["tool_id"])
        if tool:
            total = int(tool.get("quantity_total", 1))
            available = min(int(tool.get("quantity_available", 0)) + 1, total)
            sheets.update_tool(checkout["tool_id"], {"quantity_available": available})
    return {"status": "returned"}


@app.get("/api/checkouts")
def get_checkouts(request: Request, active_only: bool = False):
    require_auth(request.headers.get("x-access-code", ""))
    checkouts = sheets.get_checkouts(active_only=active_only)
    return {"checkouts": checkouts}


@app.get("/api/dashboard")
def get_dashboard(request: Request):
    require_auth(request.headers.get("x-access-code", ""))
    tools = sheets.get_tools()
    active_checkouts = sheets.get_checkouts(active_only=True)
    recent_activity = sheets.get_checkouts(active_only=False)[:10]

    alerts = []
    for tool in tools:
        condition = tool.get("condition", "")
        try:
            qty_available = int(tool.get("quantity_available", 0))
            reorder_threshold = int(tool.get("reorder_threshold", 0))
        except ValueError:
            qty_available = 0
            reorder_threshold = 0

        if condition == "Needs Repair":
            alerts.append({
                "type": "maintenance",
                "tool_id": tool["id"],
                "tool_name": tool["name"],
                "message": f"Needs repair",
                "severity": "high",
            })
        elif condition == "Poor":
            alerts.append({
                "type": "replacement",
                "tool_id": tool["id"],
                "tool_name": tool["name"],
                "message": f"Poor condition — consider replacing",
                "severity": "medium",
            })

        if reorder_threshold > 0 and qty_available <= reorder_threshold:
            alerts.append({
                "type": "low_stock",
                "tool_id": tool["id"],
                "tool_name": tool["name"],
                "message": f"{qty_available} left (reorder at {reorder_threshold})",
                "severity": "high" if qty_available == 0 else "medium",
            })

    return {
        "stats": {
            "total_tools": len(tools),
            "active_checkouts": len(active_checkouts),
            "alerts_count": len(alerts),
        },
        "alerts": alerts,
        "active_checkouts": active_checkouts,
        "recent_activity": recent_activity,
    }
