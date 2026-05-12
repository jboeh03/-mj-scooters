import { getAccessCode } from './auth'
import type { Tool, ToolAnalysis, Checkout, DashboardData } from './types'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function headers(): Record<string, string> {
  return { 'x-access-code': getAccessCode(), 'Content-Type': 'application/json' }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function analyzeTool(photos: File[]): Promise<ToolAnalysis> {
  const form = new FormData()
  photos.forEach(p => form.append('photos', p))
  const res = await fetch(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'x-access-code': getAccessCode() },
    body: form,
  })
  return handle<ToolAnalysis>(res)
}

export async function addTool(data: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/tools`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handle<{ id: string }>(res)
}

export async function getTools(): Promise<Tool[]> {
  const res = await fetch(`${BASE}/tools`, { headers: headers() })
  const body = await handle<{ tools: Tool[] }>(res)
  return body.tools
}

export async function updateTool(id: string, updates: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${BASE}/tools/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  })
  await handle<unknown>(res)
}

export async function updateToolCondition(id: string, condition: string): Promise<void> {
  const res = await fetch(`${BASE}/tools/${id}/condition`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ condition }),
  })
  await handle<unknown>(res)
}

export async function checkoutTool(data: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/checkouts`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  })
  return handle<{ id: string }>(res)
}

export async function returnTool(checkoutId: string): Promise<void> {
  const res = await fetch(`${BASE}/checkouts/${checkoutId}/return`, {
    method: 'PATCH',
    headers: headers(),
  })
  await handle<unknown>(res)
}

export async function getCheckouts(activeOnly = false): Promise<Checkout[]> {
  const res = await fetch(`${BASE}/checkouts?active_only=${activeOnly}`, { headers: headers() })
  const body = await handle<{ checkouts: Checkout[] }>(res)
  return body.checkouts
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE}/dashboard`, { headers: headers() })
  return handle<DashboardData>(res)
}
