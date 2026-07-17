import { useEffect, useState } from 'react'
import { CheckCircle2, FileWarning, RotateCcw, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { ShoppingPurchase } from '../types'

const EMPTY_FORM = { brand: '', reference: '', amount: '', purchase_date: '', return_deadline: '', invoice_number: '', cover_url: '' }

export function ShoppingPage() {
  const [items, setItems] = useState<ShoppingPurchase[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const load = () => api.get<ShoppingPurchase[]>('/shopping').then(setItems)
  useEffect(() => { void load() }, [])

  async function update(id: number, status: string) {
    await api.patch(`/shopping/${id}`, { status })
    void load()
  }

  async function remove(id: number) {
    if (!window.confirm('Eliminar esta compra?')) return
    await api.del(`/shopping/${id}`)
    setItems(current => current.filter(item => item.id !== id))
    toast('success', 'Compra eliminada.')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/shopping', {
      brand: form.brand,
      reference: form.reference || null,
      amount: Number(form.amount),
      purchase_date: form.purchase_date,
      return_deadline: form.return_deadline || null,
      invoice_number: form.invoice_number || null,
      cover_url: form.cover_url || null,
    })
    setCreating(false)
    setForm(EMPTY_FORM)
    toast('success', 'Compra registada.')
    void load()
  }

  return <div className="content-page">
    <div className="page-heading">
      <div><h1>Shopping e devoluções</h1><p>Controlo simples de peças, faturas, notas de crédito e reembolsos.</p></div>
      <button className="primary-button" onClick={() => setCreating(true)}>+ Registar compra</button>
    </div>
    <div className="shopping-grid">{items.map(item => <article className="shopping-card" key={item.id}>
      <img src={item.cover_url} alt=""/>
      <div>
        <span className="shopping-status">{item.status.split('_').join(' ')}</span>
        <h3>{item.brand}</h3>
        <p>{item.reference || 'Sem referência'}</p>
        <strong>€{item.amount.toFixed(2)}</strong>
        <small>Prazo devolução: {item.return_deadline || '—'}</small>
        <div className="shopping-actions">
          <button onClick={() => void update(item.id, 'returned')}><RotateCcw size={15}/>Devolvida</button>
          <button onClick={() => void update(item.id, 'credit_note_pending')}><FileWarning size={15}/>Nota crédito</button>
          <button onClick={() => void update(item.id, 'closed')}><CheckCircle2 size={15}/>Fechar</button>
          <button className="danger" onClick={() => void remove(item.id)}><Trash2 size={15}/></button>
        </div>
      </div>
    </article>)}</div>
    {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
      <form className="create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setCreating(false)}><X/></button>
        <h2>Registar compra</h2>
        <p>Marca, valor e data chegam. O resto pode ser completado depois.</p>
        <label>Marca<input required value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}/></label>
        <label>Referência<input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })}/></label>
        <label>Valor (€)<input required type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label>
        <label>Data de compra<input required type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })}/></label>
        <label>Prazo de devolução<input type="date" value={form.return_deadline} onChange={e => setForm({ ...form, return_deadline: e.target.value })}/></label>
        <label>Nº fatura<input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })}/></label>
        <label>Imagem (URL)<input value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })}/></label>
        <button className="primary-button" type="submit">Guardar compra</button>
      </form>
    </div>}
  </div>
}
