import { useState, useRef } from 'react'
import { Camera, X, ChevronLeft, Loader, CheckCircle } from 'lucide-react'
import { analyzeTool, addTool } from '../api'
import type { ToolAnalysis, Condition } from '../types'
import { CATEGORIES, CONDITIONS } from '../types'

interface Props {
  onBack: () => void
  onAdded: () => void
}

type Step = 'capture' | 'review' | 'done'

const BLANK_FORM = {
  name: '',
  brand: '',
  model: '',
  category: 'Power Tools',
  condition: 'Good' as Condition,
  serial_number: '',
  quantity_total: '1',
  location: '',
  reorder_threshold: '0',
  purchase_price: '',
  expected_life_years: '',
  notes: '',
  ai_description: '',
}

export default function AddToolPage({ onBack, onAdded }: Props) {
  const [step, setStep] = useState<Step>('capture')
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ ...BLANK_FORM })
  const fileRef = useRef<HTMLInputElement>(null)

  function addPhotos(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 4 - photos.length)
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setPhotos(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newPreviews])
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(previews[i])
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function analyze() {
    if (photos.length === 0) return
    setAnalyzing(true)
    setError('')
    try {
      const result: ToolAnalysis = await analyzeTool(photos)
      setForm({
        name: result.name ?? '',
        brand: result.brand ?? '',
        model: result.model ?? '',
        category: result.category ?? 'Power Tools',
        condition: (result.condition as Condition) ?? 'Good',
        serial_number: result.serial_number ?? '',
        quantity_total: '1',
        location: '',
        reorder_threshold: '0',
        purchase_price: '',
        expected_life_years: result.suggested_life_years ? String(result.suggested_life_years) : '',
        notes: '',
        ai_description: result.description ?? '',
      })
      setStep('review')
    } catch (e) {
      setError('Analysis failed. Check photos and try again.')
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      await addTool({
        ...form,
        quantity_available: form.quantity_total,
      })
      setStep('done')
    } catch (e) {
      setError('Failed to save. Please try again.')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function set(key: keyof typeof BLANK_FORM, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-full p-6 mb-4">
          <CheckCircle size={40} className="text-emerald-400" />
        </div>
        <h2 className="text-xl font-black text-white mb-1">Tool Added!</h2>
        <p className="text-zinc-500 text-sm mb-8">{form.name} is now in your inventory.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => { setStep('capture'); setPhotos([]); setPreviews([]); setForm({ ...BLANK_FORM }) }}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl py-3 transition-colors"
          >
            Add Another Tool
          </button>
          <button
            onClick={onAdded}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl py-3 transition-colors"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Top bar */}
      <div className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-900 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-black text-white flex-1">
          {step === 'capture' ? 'Add Tool' : 'Confirm Details'}
        </h1>
        {step === 'review' && (
          <button onClick={() => setStep('capture')} className="text-xs text-zinc-500">
            Re-shoot
          </button>
        )}
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Photo capture step */}
        {step === 'capture' && (
          <>
            <p className="text-zinc-400 text-sm">
              Take up to 4 photos — include the full tool, brand label, and any model numbers visible.
            </p>

            {/* Photo grid */}
            <div className="grid grid-cols-2 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-900">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-2 right-2 bg-zinc-950/80 rounded-full p-1 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl bg-zinc-900 border-2 border-dashed border-zinc-700 hover:border-amber-500 transition-colors flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-amber-400"
                >
                  <Camera size={24} />
                  <span className="text-xs font-semibold">
                    {photos.length === 0 ? 'Add Photo' : 'Add More'}
                  </span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={e => addPhotos(e.target.files)}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={analyze}
              disabled={photos.length === 0 || analyzing}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Analyzing…
                </>
              ) : (
                'Identify Tool'
              )}
            </button>
          </>
        )}

        {/* Review / form step */}
        {step === 'review' && (
          <>
            {form.ai_description && (
              <div className="bg-zinc-900 rounded-xl px-4 py-3">
                <p className="text-xs text-zinc-500 mb-1">AI Analysis</p>
                <p className="text-zinc-300 text-sm">{form.ai_description}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <Field label="Tool Name *">
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Circular Saw"
                />
              </Field>

              {/* Brand + Model */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Brand">
                  <input value={form.brand} onChange={e => set('brand', e.target.value)} className={inputCls} placeholder="DeWalt" />
                </Field>
                <Field label="Model">
                  <input value={form.model} onChange={e => set('model', e.target.value)} className={inputCls} placeholder="DWE575" />
                </Field>
              </div>

              {/* Category */}
              <Field label="Category">
                <select value={form.category} onChange={e => set('category', e.target.value)} className={inputCls}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>

              {/* Condition */}
              <Field label="Condition">
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set('condition', c)}
                      className={`text-xs font-semibold rounded-full px-3 py-1 border transition-colors ${
                        form.condition === c
                          ? 'bg-amber-500 text-zinc-950 border-amber-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Qty + Reorder threshold */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input
                    type="number"
                    min="1"
                    value={form.quantity_total}
                    onChange={e => set('quantity_total', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Reorder at (qty)">
                  <input
                    type="number"
                    min="0"
                    value={form.reorder_threshold}
                    onChange={e => set('reorder_threshold', e.target.value)}
                    className={inputCls}
                    placeholder="0 = no alert"
                  />
                </Field>
              </div>

              {/* Location */}
              <Field label="Warehouse Location">
                <input
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. Shelf B2, Back Wall"
                />
              </Field>

              {/* Serial # */}
              <Field label="Serial Number">
                <input
                  value={form.serial_number}
                  onChange={e => set('serial_number', e.target.value)}
                  className={inputCls}
                  placeholder="If visible on tool"
                />
              </Field>

              {/* Purchase price + Expected life */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Purchase Price ($)">
                  <input
                    type="number"
                    value={form.purchase_price}
                    onChange={e => set('purchase_price', e.target.value)}
                    className={inputCls}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Expected Life (yrs)">
                  <input
                    type="number"
                    value={form.expected_life_years}
                    onChange={e => set('expected_life_years', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Notes */}
              <Field label="Notes">
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={2}
                  className={inputCls + ' resize-none'}
                  placeholder="Any notes about this tool…"
                />
              </Field>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={save}
              disabled={!form.name.trim() || saving}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-xl py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader size={16} className="animate-spin" /> Saving…</> : 'Save to Inventory'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors'
