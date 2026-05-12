import { useEffect, useState } from 'react'
import { Search, ChevronDown, ChevronUp, MapPin, Calendar, Hash, StickyNote, RotateCcw, Pencil, Check, X } from 'lucide-react'
import { getTools, updateTool, updateToolCondition } from '../api'
import type { Tool, Condition } from '../types'
import { CONDITIONS, CATEGORIES } from '../types'

function conditionBadge(c: Condition) {
  const map: Record<Condition, string> = {
    Excellent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    Good: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    Fair: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Poor: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'Needs Repair': 'bg-red-500/15 text-red-400 border-red-500/20',
  }
  return map[c] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

function availabilityLabel(tool: Tool) {
  const total = parseInt(tool.quantity_total || '1')
  const available = parseInt(tool.quantity_available || '0')
  if (available === 0) return { text: 'All Out', color: 'text-red-400' }
  if (available < total) return { text: `${available}/${total} avail.`, color: 'text-amber-400' }
  return { text: `${available}/${total} avail.`, color: 'text-emerald-400' }
}

type Filter = 'All' | 'Available' | 'Out' | 'Attention'

interface EditState {
  name: string
  brand: string
  model: string
  location: string
  notes: string
  reorder_threshold: string
  quantity_total: string
}

interface Props {
  onNavigate: (page: string) => void
}

export default function InventoryPage({ onNavigate }: Props) {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [conditionSaving, setConditionSaving] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      const t = await getTools()
      setTools(t)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(tool: Tool) {
    setEditing(tool.id)
    setEditState({
      name: tool.name,
      brand: tool.brand,
      model: tool.model,
      location: tool.location,
      notes: tool.notes,
      reorder_threshold: tool.reorder_threshold || '0',
      quantity_total: tool.quantity_total || '1',
    })
  }

  async function saveEdit(tool: Tool) {
    if (!editState) return
    setSaving(true)
    try {
      await updateTool(tool.id, {
        name: editState.name,
        brand: editState.brand,
        model: editState.model,
        location: editState.location,
        notes: editState.notes,
        reorder_threshold: editState.reorder_threshold,
        quantity_total: editState.quantity_total,
      })
      await load()
      setEditing(null)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleConditionChange(tool: Tool, cond: Condition) {
    setConditionSaving(true)
    try {
      await updateToolCondition(tool.id, cond)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setConditionSaving(false)
    }
  }

  const filtered = tools.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q || [t.name, t.brand, t.model, t.category].some(s => s.toLowerCase().includes(q))
    if (!matchSearch) return false
    const avail = parseInt(t.quantity_available || '0')
    const total = parseInt(t.quantity_total || '1')
    if (filter === 'Available') return avail > 0
    if (filter === 'Out') return avail < total
    if (filter === 'Attention') return ['Poor', 'Needs Repair'].includes(t.condition)
    return true
  })

  const filters: Filter[] = ['All', 'Available', 'Out', 'Attention']

  return (
    <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Inventory</h1>
          <p className="text-zinc-500 text-sm">{tools.length} tools</p>
        </div>
        <button
          onClick={() => onNavigate('add-tool')}
          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl px-4 py-2 text-sm transition-colors"
        >
          + Add
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="text-zinc-500 text-sm text-center py-8">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 text-sm">No tools found.</p>
          <button
            onClick={() => onNavigate('add-tool')}
            className="mt-3 text-amber-400 text-sm font-semibold"
          >
            + Add your first tool
          </button>
        </div>
      )}

      <div className="space-y-2 pb-24">
        {filtered.map(tool => {
          const isExpanded = expanded === tool.id
          const isEditing = editing === tool.id
          const avail = availabilityLabel(tool)

          return (
            <div key={tool.id} className="bg-zinc-900 rounded-2xl overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : tool.id)}
                className="w-full text-left px-4 py-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white leading-tight">{tool.name}</p>
                    <span className={`shrink-0 text-xs font-semibold border rounded-full px-2 py-0.5 ${conditionBadge(tool.condition as Condition)}`}>
                      {tool.condition}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {[tool.brand, tool.model].filter(Boolean).join(' · ') || tool.category}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-xs font-semibold ${avail.color}`}>{avail.text}</span>
                    <span className="text-zinc-600 text-xs">{tool.category}</span>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-zinc-500 mt-1 shrink-0" /> : <ChevronDown size={16} className="text-zinc-500 mt-1 shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                  {isEditing && editState ? (
                    <div className="space-y-3">
                      {([
                        ['Tool Name', 'name'],
                        ['Brand', 'brand'],
                        ['Model', 'model'],
                        ['Location in Warehouse', 'location'],
                        ['Notes', 'notes'],
                        ['Total Quantity', 'quantity_total'],
                        ['Reorder Threshold', 'reorder_threshold'],
                      ] as [string, keyof EditState][]).map(([label, key]) => (
                        <div key={key}>
                          <label className="text-xs text-zinc-500 block mb-1">{label}</label>
                          <input
                            value={editState[key]}
                            onChange={e => setEditState({ ...editState, [key]: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => saveEdit(tool)}
                          disabled={saving}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-sm rounded-lg px-4 py-2 transition-colors"
                        >
                          <Check size={14} /> Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="flex items-center gap-1.5 bg-zinc-800 text-zinc-300 text-sm rounded-lg px-4 py-2"
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Info rows */}
                      <div className="space-y-2 text-sm">
                        {tool.location && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <MapPin size={13} className="shrink-0 text-zinc-500" />
                            <span>{tool.location}</span>
                          </div>
                        )}
                        {tool.last_used_date && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Calendar size={13} className="shrink-0 text-zinc-500" />
                            <span>Last used {tool.last_used_date}</span>
                          </div>
                        )}
                        {tool.serial_number && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <Hash size={13} className="shrink-0 text-zinc-500" />
                            <span>{tool.serial_number}</span>
                          </div>
                        )}
                        {tool.notes && (
                          <div className="flex items-start gap-2 text-zinc-400">
                            <StickyNote size={13} className="shrink-0 text-zinc-500 mt-0.5" />
                            <span>{tool.notes}</span>
                          </div>
                        )}
                        {tool.purchase_price && (
                          <div className="text-zinc-500 text-xs">Purchased for ${tool.purchase_price}</div>
                        )}
                      </div>

                      {/* Condition updater */}
                      <div>
                        <p className="text-xs text-zinc-500 mb-2">Update condition</p>
                        <div className="flex flex-wrap gap-1.5">
                          {CONDITIONS.map(c => (
                            <button
                              key={c}
                              onClick={() => handleConditionChange(tool, c)}
                              disabled={conditionSaving}
                              className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 transition-colors ${
                                tool.condition === c
                                  ? conditionBadge(c)
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(tool)}
                          className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
                        >
                          <Pencil size={12} /> Edit Details
                        </button>
                        <button
                          onClick={() => { onNavigate('checkouts') }}
                          className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
                        >
                          <RotateCcw size={12} /> Check Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
