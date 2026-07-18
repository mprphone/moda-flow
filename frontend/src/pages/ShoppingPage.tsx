import { useEffect, useMemo, useState } from 'react'
import { Camera, CheckCircle2, FileWarning, Pencil, RotateCcw, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import { UploadInput } from '../components/UploadInput'
import type { Development, ShoppingPurchase } from '../types'

const EMPTY_FORM = { brand: '', reference: '', amount: '', purchase_date: '', return_deadline: '', invoice_number: '', credit_note_number: '', cover_url: '', development_id: '', notes: '', invoice_sent: false, credit_note_sent: false, refund_received: false, status: 'in_use' }
const STATUS_NAMES: Record<string, string> = { in_use: 'Em utilização', to_return: 'Para devolver', returned: 'Devolvida', credit_note_pending: 'Aguarda nota de crédito', refund_pending: 'Aguarda reembolso', closed: 'Fechada' }
const STATUS_OPTIONS = Object.keys(STATUS_NAMES)
type Form = typeof EMPTY_FORM
type PhotoResult = { brand?: string; reference?: string; amount?: number; purchase_date?: string; invoice_number?: string; description?: string; confidence: number }

function toForm(item: ShoppingPurchase): Form {
  return { brand: item.brand, reference: item.reference || '', amount: String(item.amount), purchase_date: item.purchase_date, return_deadline: item.return_deadline || '', invoice_number: item.invoice_number || '', credit_note_number: item.credit_note_number || '', cover_url: item.cover_url || '', development_id: item.development_id ? String(item.development_id) : '', notes: item.notes || '', invoice_sent: item.invoice_sent, credit_note_sent: item.credit_note_sent, refund_received: item.refund_received, status: item.status }
}

export function ShoppingPage() {
  const [items, setItems] = useState<ShoppingPurchase[]>([])
  const [developments, setDevelopments] = useState<Development[]>([])
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<ShoppingPurchase | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [reading, setReading] = useState(false)
  const [query, setQuery] = useState('')
  const load = () => api.get<ShoppingPurchase[]>('/shopping').then(setItems)
  useEffect(() => { void load(); api.get<Development[]>('/developments').then(setDevelopments) }, [])

  const visible = useMemo(() => items.filter(item => `${item.brand} ${item.reference || ''} ${item.invoice_number || ''}`.toLowerCase().includes(query.toLowerCase())), [items, query])
  const urgent = items.filter(item => item.days_to_return != null && item.days_to_return <= 3 && !['returned', 'closed'].includes(item.status)).length

  function openCreate() { setSelected(null); setForm(EMPTY_FORM); setCreating(true) }
  function openEdit(item: ShoppingPurchase) { setSelected(item); setForm(toForm(item)); setCreating(true) }

  async function quickUpdate(id: number, payload: Record<string, unknown>) {
    const updated = await api.patch<ShoppingPurchase>(`/shopping/${id}`, payload)
    setItems(current => current.map(item => item.id === id ? updated : item))
  }

  async function remove(id: number) {
    if (!window.confirm('Eliminar esta compra?')) return
    await api.del(`/shopping/${id}`)
    setItems(current => current.filter(item => item.id !== id)); setCreating(false)
    toast('success', 'Compra eliminada.')
  }

  async function readPhoto() {
    if (!form.cover_url) return
    setReading(true)
    try {
      const result = await api.post<PhotoResult>('/shopping/read-photo', { image_url: form.cover_url })
      setForm(current => ({ ...current,
        brand: result.brand || current.brand, reference: result.reference || current.reference,
        amount: result.amount != null ? String(result.amount) : current.amount,
        purchase_date: result.purchase_date || current.purchase_date,
        invoice_number: result.invoice_number || current.invoice_number,
        notes: result.description || current.notes,
      }))
      toast('success', `Fotografia lida (${Math.round(result.confidence * 100)}% de confiança). Confirme os campos.`)
    } finally { setReading(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, amount: Number(form.amount), return_deadline: form.return_deadline || null, invoice_number: form.invoice_number || null, credit_note_number: form.credit_note_number || null, cover_url: form.cover_url || null, development_id: form.development_id ? Number(form.development_id) : null, notes: form.notes || null }
    if (selected) await api.patch(`/shopping/${selected.id}`, payload)
    else await api.post('/shopping', payload)
    setCreating(false); setForm(EMPTY_FORM)
    toast('success', selected ? 'Compra atualizada.' : 'Compra registada.'); void load()
  }

  return <div className="content-page">
    <div className="page-heading"><div><h1>Shopping e devoluções</h1><p>{items.length} peças · {urgent} devoluções urgentes. Faturas, notas de crédito e reembolsos num só fluxo.</p></div><button className="primary-button" onClick={openCreate}>+ Registar compra</button></div>
    <div className="filter-bar"><input placeholder="Pesquisar marca, referência ou fatura..." value={query} onChange={e => setQuery(e.target.value)}/></div>
    <div className="shopping-grid">{visible.map(item => <article className="shopping-card" key={item.id} onClick={() => openEdit(item)}>
      {item.cover_url ? <img src={item.cover_url} alt={item.reference || item.brand}/> : <div className="shopping-photo-placeholder"><Camera/></div>}
      <div><span className="shopping-status">{STATUS_NAMES[item.status] || item.status}</span><h3>{item.brand}</h3><p>{item.reference || 'Sem referência'}</p><strong>€{item.amount.toFixed(2)}</strong>
        <small>Compra: {item.purchase_date} · Devolver: {item.return_deadline || '—'}{item.days_to_return != null ? ` (${item.days_to_return} d)` : ''}</small>
        <div className="chips"><span className={`chip tone-${item.invoice_sent ? 'mint' : 'yellow'}`}>{item.invoice_sent ? 'Fatura enviada' : 'Fatura por enviar'}</span>{item.status !== 'in_use' && <span className={`chip tone-${item.credit_note_sent ? 'mint' : 'pink'}`}>{item.credit_note_sent ? 'Nota crédito enviada' : 'Nota crédito pendente'}</span>}</div>
        <div className="shopping-actions" onClick={e => e.stopPropagation()}><button title="Devolvida" onClick={() => void quickUpdate(item.id, { status: 'returned' })}><RotateCcw size={15}/></button><button title="Aguardar nota de crédito" onClick={() => void quickUpdate(item.id, { status: 'credit_note_pending' })}><FileWarning size={15}/></button><button title="Fechar" onClick={() => void quickUpdate(item.id, { status: 'closed', refund_received: true })}><CheckCircle2 size={15}/></button><button title="Editar" onClick={() => openEdit(item)}><Pencil size={15}/></button></div>
      </div></article>)}</div>
    {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}><form className="create-modal wide" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
      <button type="button" className="modal-close" onClick={() => setCreating(false)}><X/></button><h2>{selected ? 'Ficha da compra' : 'Registar compra'}</h2><p>Carregue uma foto da etiqueta, talão ou fatura e use “Ler fotografia” para preencher os dados.</p>
      <UploadInput value={form.cover_url} onChange={url => setForm({ ...form, cover_url: url })} label="Fotografia da peça, etiqueta ou fatura"/>
      {form.cover_url && <button type="button" className="secondary-button" disabled={reading} onClick={() => void readPhoto()}><Camera size={15}/>{reading ? 'A ler...' : 'Ler fotografia e preencher'}</button>}
      <div className="form-grid"><label>Marca *<input required value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}/></label><label>Referência<input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}/></label><label>Valor (€) *<input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label><label>Data da compra *<input required type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })}/></label><label>Prazo de devolução<input type="date" value={form.return_deadline} onChange={e => setForm({ ...form, return_deadline: e.target.value })}/></label><label>Estado<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{STATUS_NAMES[status]}</option>)}</select></label><label>N.º fatura<input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })}/></label><label>N.º nota de crédito<input value={form.credit_note_number} onChange={e => setForm({ ...form, credit_note_number: e.target.value })}/></label><label>Desenvolvimento<select value={form.development_id} onChange={e => setForm({ ...form, development_id: e.target.value })}><option value="">Sem ligação</option>{developments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}</select></label></div>
      <div className="chips"><label><input type="checkbox" checked={form.invoice_sent} onChange={e => setForm({ ...form, invoice_sent: e.target.checked })}/> Fatura enviada</label><label><input type="checkbox" checked={form.credit_note_sent} onChange={e => setForm({ ...form, credit_note_sent: e.target.checked })}/> Nota crédito enviada</label><label><input type="checkbox" checked={form.refund_received} onChange={e => setForm({ ...form, refund_received: e.target.checked })}/> Reembolso recebido</label></div>
      <label>Notas<textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Descrição da peça, tamanho, cor, observações..."/></label>
      <div className="modal-actions">{selected && <button type="button" className="action danger" onClick={() => void remove(selected.id)}><Trash2 size={15}/>Eliminar</button>}<button className="primary-button" type="submit">Guardar compra</button></div>
    </form></div>}
  </div>
}
