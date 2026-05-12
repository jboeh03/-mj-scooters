import { useEffect, useState } from 'react'
import { RotateCcw, Plus, X, Check, Users, History } from 'lucide-react'
import { getCheckouts, getTools, checkoutTool, returnTool } from '../api'
import type { Checkout, Tool } from '../types'

type Tab = 'active' | 'history'

interface CheckoutForm {
  tool_id: string
  crew_member: string
  job_project: string
  notes: string
}

const BLANK: CheckoutForm = { tool_id: '', crew_member: '', job_project: '', notes: '' }

export default function CheckoutsPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [checkouts, setCheckouts] = useState<Checkout[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CheckoutForm>({ ...BLANK })
  const [submitting, setSubmitting] = useState(false)
  const [returning, setReturning] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [cs, ts] = await Promise.all([
        getCheckouts(false),
        getTools(),
      ])
      setCheckouts(cs)
      setTools(ts)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCheckout() {
    if (!form.tool_id || !form.crew_member.trim()) return
    setSubmitting(true)
    setError('')
    const tool = tools.find(t => t.id === form.tool_id)
    try {
      await checkoutTool({
        tool_id: form.tool_id,
        tool_name: tool?.name ?? '',
        crew_member: form.crew_member.trim(),
        job_project: form.job_project.trim(),
        notes: form.notes.trim(),
      })
      setForm({ ...BLANK })
      setShowForm(false)
      await load()
    } catch (e) {
      setError('Failed to check out tool. Please try again.')
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

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

  const active = checkouts.filter(c => c.status === 'Out')
  const history = checkouts.filter(c => c.status === 'Returned')
  const displayed = tab === 'active' ? active : history

  const availableTools = tools.filter(t => parseInt(t.quantity_available || '0') > 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Checkouts</h1>
          <p className="text-zinc-500 text-sm">{active.length} tools currently out</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl px-4 py-2 text-sm transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} /> Check Out
        </button>
      </div>

      {/* Checkout form */}
      {showForm && (
        <div className="bg-zinc-900 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-white text-sm">Check Out a Tool</h2>
            <button onClick={() => { setShowForm(false); setError('') }}>
              <X size={18} className="text-zinc-500" />
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Tool *</label>
            <select
              value={form.tool_id}
              onChange={e => setForm(f => ({ ...f, tool_id: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="">Select a tool…</option>
              {availableTools.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.brand ? ` (${t.brand})` : ''} — {t.quantity_available} avail.
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Crew Member *</label>
            <input
              value={form.crew_member}
              onChange={e => setForm(f => ({ ...f, crew_member: e.target.value }))}
              placeholder="Name of person taking the tool"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Job / Project</label>
            <input
              value={form.job_project}
              onChange={e => setForm(f => ({ ...f, job_project: e.target.value }))}
              placeholder="e.g. 123 Main St framing"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Notes</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleCheckout}
            disabled={!form.tool_id || !form.crew_member.trim() || submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><RotateCcw size={14} className="animate-spin" /> Saving…</>
            ) : (
              <><Check size={14} /> Confirm Check Out</>
            )}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-zinc-900 rounded-xl p-1">
        {(['active', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {t === 'active' ? <Users size={14} /> : <History size={14} />}
            {t === 'active' ? `Active (${active.length})` : `History (${history.length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-500 text-sm text-center py-8">Loading…</p>}

      {!loading && displayed.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">
            {tab === 'active' ? 'No tools currently checked out.' : 'No checkout history yet.'}
          </p>
        </div>
      )}

      <div className="space-y-2 pb-24">
        {displayed.map(c => (
          <div key={c.id} className="bg-zinc-900 rounded-2xl px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm leading-tight">{c.tool_name}</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  {c.crew_member}
                  {c.job_project ? <span className="text-zinc-600"> · {c.job_project}</span> : null}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-600">
                  <span>Out: {c.date_out.slice(0, 10)}</span>
                  {c.date_in && <span>In: {c.date_in.slice(0, 10)}</span>}
                </div>
                {c.notes && <p className="text-zinc-500 text-xs mt-1 italic">{c.notes}</p>}
              </div>
              {c.status === 'Out' && (
                <button
                  onClick={() => handleReturn(c.id)}
                  disabled={returning === c.id}
                  className="shrink-0 flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
                >
                  <RotateCcw size={12} className={returning === c.id ? 'animate-spin' : ''} />
                  Return
                </button>
              )}
              {c.status === 'Returned' && (
                <span className="shrink-0 text-xs text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5">
                  Returned
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
