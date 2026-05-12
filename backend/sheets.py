import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from datetime import datetime

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_ID = os.getenv("SHEET_ID", "")

TOOLS_SHEET = "Tools"
CHECKOUTS_SHEET = "Checkouts"

TOOLS_HEADERS = [
    "ID", "Tool Name", "Brand", "Model", "Category", "Condition",
    "Qty Total", "Qty Available", "Location", "Reorder Threshold",
    "Last Used Date", "Date Added", "Notes", "Serial Number",
    "Purchase Date", "Purchase Price", "Expected Life (yrs)", "AI Description"
]

CHECKOUTS_HEADERS = [
    "Checkout ID", "Tool ID", "Tool Name", "Crew Member",
    "Date Out", "Date In", "Job/Project", "Notes", "Status"
]


def _get_service():
    creds_json = os.getenv("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        creds = service_account.Credentials.from_service_account_file(
            "credentials.json", scopes=SCOPES
        )
    return build("sheets", "v4", credentials=creds)


def _ensure_headers():
    svc = _get_service()
    sheets = svc.spreadsheets()

    # Tools sheet headers
    try:
        result = sheets.values().get(spreadsheetId=SHEET_ID, range=f"{TOOLS_SHEET}!A1:R1").execute()
        if not result.get("values"):
            sheets.values().update(
                spreadsheetId=SHEET_ID,
                range=f"{TOOLS_SHEET}!A1",
                valueInputOption="RAW",
                body={"values": [TOOLS_HEADERS]}
            ).execute()
    except Exception:
        pass

    # Checkouts sheet headers
    try:
        result = sheets.values().get(spreadsheetId=SHEET_ID, range=f"{CHECKOUTS_SHEET}!A1:I1").execute()
        if not result.get("values"):
            sheets.values().update(
                spreadsheetId=SHEET_ID,
                range=f"{CHECKOUTS_SHEET}!A1",
                valueInputOption="RAW",
                body={"values": [CHECKOUTS_HEADERS]}
            ).execute()
    except Exception:
        pass


def _rows_to_dicts(headers: list, rows: list) -> list:
    result = []
    for row in rows:
        padded = row + [""] * (len(headers) - len(row))
        result.append(dict(zip(headers, padded)))
    return result


def get_tools() -> list:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{TOOLS_SHEET}!A2:R"
    ).execute()
    rows = result.get("values", [])
    tools = _rows_to_dicts(TOOLS_HEADERS, rows)
    # Normalize keys to snake_case
    normalized = []
    for t in tools:
        if not t.get("ID"):
            continue
        normalized.append({
            "id": t["ID"],
            "name": t["Tool Name"],
            "brand": t["Brand"],
            "model": t["Model"],
            "category": t["Category"],
            "condition": t["Condition"],
            "quantity_total": t["Qty Total"] or "1",
            "quantity_available": t["Qty Available"] or "1",
            "location": t["Location"],
            "reorder_threshold": t["Reorder Threshold"] or "0",
            "last_used_date": t["Last Used Date"],
            "date_added": t["Date Added"],
            "notes": t["Notes"],
            "serial_number": t["Serial Number"],
            "purchase_date": t["Purchase Date"],
            "purchase_price": t["Purchase Price"],
            "expected_life_years": t["Expected Life (yrs)"],
            "ai_description": t["AI Description"],
        })
    return normalized


def get_tool_by_id(tool_id: str) -> dict | None:
    tools = get_tools()
    for t in tools:
        if t["id"] == tool_id:
            return t
    return None


def _get_tool_row_index(tool_id: str) -> int | None:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{TOOLS_SHEET}!A2:A"
    ).execute()
    rows = result.get("values", [])
    for i, row in enumerate(rows):
        if row and row[0] == tool_id:
            return i + 2  # 1-indexed, +1 for header
    return None


def _get_checkout_row_index(checkout_id: str) -> int | None:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{CHECKOUTS_SHEET}!A2:A"
    ).execute()
    rows = result.get("values", [])
    for i, row in enumerate(rows):
        if row and row[0] == checkout_id:
            return i + 2
    return None


def _next_tool_id() -> str:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{TOOLS_SHEET}!A2:A"
    ).execute()
    rows = result.get("values", [])
    ids = [int(r[0]) for r in rows if r and r[0].isdigit()]
    return str(max(ids) + 1) if ids else "1"


def _next_checkout_id() -> str:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{CHECKOUTS_SHEET}!A2:A"
    ).execute()
    rows = result.get("values", [])
    ids = [int(r[0]) for r in rows if r and r[0].isdigit()]
    return str(max(ids) + 1) if ids else "1"


def add_tool(data: dict) -> str:
    _ensure_headers()
    svc = _get_service()
    tool_id = _next_tool_id()
    now = datetime.now().strftime("%Y-%m-%d")
    qty = str(data.get("quantity_total", 1))
    row = [
        tool_id,
        data.get("name", ""),
        data.get("brand", ""),
        data.get("model", ""),
        data.get("category", ""),
        data.get("condition", "Good"),
        qty,
        qty,  # available = total at start
        data.get("location", ""),
        str(data.get("reorder_threshold", 0)),
        data.get("last_used_date", ""),
        now,
        data.get("notes", ""),
        data.get("serial_number", ""),
        data.get("purchase_date", ""),
        data.get("purchase_price", ""),
        str(data.get("expected_life_years", "")),
        data.get("ai_description", ""),
    ]
    svc.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range=f"{TOOLS_SHEET}!A2",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]}
    ).execute()
    return tool_id


def update_tool(tool_id: str, updates: dict):
    row_idx = _get_tool_row_index(tool_id)
    if row_idx is None:
        return

    field_map = {
        "name": ("B", 1),
        "brand": ("C", 2),
        "model": ("D", 3),
        "category": ("E", 4),
        "condition": ("F", 5),
        "quantity_total": ("G", 6),
        "quantity_available": ("H", 7),
        "location": ("I", 8),
        "reorder_threshold": ("J", 9),
        "last_used_date": ("K", 10),
        "notes": ("M", 12),
        "serial_number": ("N", 13),
        "purchase_date": ("O", 14),
        "purchase_price": ("P", 15),
        "expected_life_years": ("Q", 16),
    }

    svc = _get_service()
    for key, value in updates.items():
        if key in field_map:
            col, _ = field_map[key]
            svc.spreadsheets().values().update(
                spreadsheetId=SHEET_ID,
                range=f"{TOOLS_SHEET}!{col}{row_idx}",
                valueInputOption="RAW",
                body={"values": [[str(value)]]}
            ).execute()


def get_checkouts(active_only: bool = False) -> list:
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{CHECKOUTS_SHEET}!A2:I"
    ).execute()
    rows = result.get("values", [])
    checkouts = _rows_to_dicts(CHECKOUTS_HEADERS, rows)
    normalized = []
    for c in checkouts:
        if not c.get("Checkout ID"):
            continue
        status = c.get("Status", "Out")
        if active_only and status != "Out":
            continue
        normalized.append({
            "id": c["Checkout ID"],
            "tool_id": c["Tool ID"],
            "tool_name": c["Tool Name"],
            "crew_member": c["Crew Member"],
            "date_out": c["Date Out"],
            "date_in": c["Date In"],
            "job_project": c["Job/Project"],
            "notes": c["Notes"],
            "status": status,
        })
    return list(reversed(normalized))


def add_checkout(data: dict) -> str:
    _ensure_headers()
    svc = _get_service()
    checkout_id = _next_checkout_id()
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    row = [
        checkout_id,
        data.get("tool_id", ""),
        data.get("tool_name", ""),
        data.get("crew_member", ""),
        now,
        "",
        data.get("job_project", ""),
        data.get("notes", ""),
        "Out",
    ]
    svc.spreadsheets().values().append(
        spreadsheetId=SHEET_ID,
        range=f"{CHECKOUTS_SHEET}!A2",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]}
    ).execute()
    return checkout_id


def return_checkout(checkout_id: str) -> dict | None:
    row_idx = _get_checkout_row_index(checkout_id)
    if row_idx is None:
        return None

    # Read the row to get tool_id
    svc = _get_service()
    result = svc.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=f"{CHECKOUTS_SHEET}!A{row_idx}:I{row_idx}"
    ).execute()
    rows = result.get("values", [])
    if not rows:
        return None
    row = rows[0] + [""] * (9 - len(rows[0]))
    checkout = {
        "id": row[0],
        "tool_id": row[1],
        "tool_name": row[2],
    }

    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    # Update Date In (col F = index 5) and Status (col I = index 8)
    svc.spreadsheets().values().batchUpdate(
        spreadsheetId=SHEET_ID,
        body={
            "valueInputOption": "RAW",
            "data": [
                {"range": f"{CHECKOUTS_SHEET}!F{row_idx}", "values": [[now]]},
                {"range": f"{CHECKOUTS_SHEET}!I{row_idx}", "values": [["Returned"]]},
            ]
        }
    ).execute()
    return checkout
