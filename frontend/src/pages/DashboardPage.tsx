import { useEffect, useState } from 'react'
import { TriangleAlert, Wrench, Users, Package, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import { getDashboard, returnTool } from '../api'
import type { DashboardData, Alert } from '../types'

function severityColor(s: Alert['severity']) {
  if (s === 'high') return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (s === 'medium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-zinc-400 bg-zinc-800 border-zinc-700'
}

function alertIcon(type: Alert['type']) {
  if (type === 'maintenance') return <Wrench size={14} />
  if (type === 'replacement') return <AlertCircle size={14} />
  return <Package size={14} />
}

interface Props {
  onNavigate: (page: string) => void
}

export default function DashboardPage({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [returning, setReturning] = useState<string | null>(null)

  async function load() {
    try {
      const d = await getDashboard()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleReturn(checkoutId: string) {
    setReturning(checkoutId)
    try {
      await returnTool(checkoutId)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setReturning(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 text-sm">Loading…</div>
      </div>
    )
  }

  const stats = data?.stats
  const alerts = data?.alerts ?? []
  const activeCheckouts = data?.active_checkouts ?? []

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-0.5">MJ & Scooters Warehouse</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('inventory')}
          className="bg-zinc-900 rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-2xl font-black text-white">{stats?.total_tools ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Tools</p>
        </button>
        <button
          onClick={() => onNavigate('checkouts')}
          className="bg-zinc-900 rounded-2xl p-4 text-left active:scale-95 transition-transform"
        >
          <p className="text-2xl font-black text-amber-400">{stats?.active_checkouts ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Checked Out</p>
        </button>
        <div className="bg-zinc-900 rounded-2xl p-4">
          <p className={`text-2xl font-black ${(stats?.alerts_count ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {stats?.alerts_count ?? 0}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Alerts</p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <TriangleAlert size={12} />
            Needs Attention
          </h2>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${severityColor(a.severity)}`}
              >
                <span className="mt-0.5 shrink-0">{alertIcon(a.type)}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{a.tool_name}</p>
                  <p className="text-xs opacity-75 mt-0.5">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3">
          <CheckCircle size={16} />
          All tools are in good shape — no alerts.
        </div>
      )}

      {/* Active Checkouts */}
      {activeCheckouts.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={12} />
            Currently Out ({activeCheckouts.length})
          </h2>
          <div className="space-y-2">
            {activeCheckouts.map(c => (
              <div key={c.id} className="bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{c.tool_name}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {c.crew_member}{c.job_project ? ` · ${c.job_project}` : ''} · out {c.date_out.slice(0, 10)}
                  </p>
                </div>
                <button
                  onClick={() => handleReturn(c.id)}
                  disabled={returning === c.id}
                  className="shrink-0 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-medium rounded-lg px-3 py-1.5 transition-colors"
                >
                  <RotateCcw size={12} className={returning === c.id ? 'animate-spin' : ''} />
                  Return
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <button
          onClick={() => onNavigate('add-tool')}
          className="bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-zinc-950 font-bold rounded-xl py-3 text-sm"
        >
          + Add Tool
        </button>
        <button
          onClick={() => onNavigate('checkouts')}
          className="bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all text-white font-bold rounded-xl py-3 text-sm"
        >
          Check Out Tool
        </button>
      </div>
    </div>
  )
}
