import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Scroll, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import { UploadInput } from '../components/UploadInput'
import type { Development, FabricRequest, Supplier } from '../types'

type Response = { statuses: string[]; items: FabricRequest[] }

export const FABRIC_STATUS_NAMES: Record<string, string> = {
  pedido: 'Pedido',
  envio_em_curso: 'Envio em curso',
  recebida: 'Recebida',
  tingimento: 'Tingimento',
  cancelada: 'Cancelada',
}

const STATUS_TONES: Record<string, string> = {
  pedido: 'yellow',
  envio_em_curso: 'sky',
  recebida: 'mint',
  tingimento: 'lilac',
  cancelada: 'pink',
}

const EMPTY_FORM = {
  reference: '', supplier_id: '', development_id: '', color: '', quantity_meters: '',
  article: '', composition: '', width: '', grammage: '', price_per_meter: '', leadtime: '',
  requested_at: '', notes: '', cover_url: '',
}

export function FabricsPage() {
  const [data, setData] = useState<Response>({ statuses: [], items: [] })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [developments, setDevelopments] = useState<Development[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = () => api.get<Response>('/fabric-requests').then(setData)
  useEffect(() => {
    void load()
    api.get<Supplier[]>('/suppliers').then(setSuppliers)
    api.get<Development[]>('/developments').then(setDevelopments)
  }, [])

  const visible = useMemo(() => {
    const filtered = data.items.filter(item =>
      (!statusFilter || item.status === statusFilter) &&
      (!supplierFilter || String(item.supplier_id) === supplierFilter))
    // Pendentes primeiro, os mais antigos no topo — é a lista de "quem relançar hoje".
    return [...filtered].sort((a, b) => (b.days_pending ?? -1) - (a.days_pending ?? -1))
  }, [data, statusFilter, supplierFilter])

  const pendingCount = data.items.filter(item => item.days_pending != null).length
  const reminderCount = data.items.filter(item => item.needs_reminder).length

  async function updateStatus(id: number, status: string) {
    const updated = await api.patch<FabricRequest>(`/fabric-requests/${id}`, { status })
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
    toast('success', `Malha em "${FABRIC_STATUS_NAMES[status] || status}".`)
  }

  async function linkDevelopment(id: number, developmentId: string) {
    const updated = await api.patch<FabricRequest>(`/fabric-requests/${id}`, { development_id: developmentId ? Number(developmentId) : null })
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
    toast('success', updated.development_code ? `Malha associada ao modelo ${updated.development_code}.` : 'Associação ao modelo removida.')
  }

  async function remove(id: number) {
    if (!window.confirm('Eliminar este pedido de malha?')) return
    await api.del(`/fabric-requests/${id}`)
    setData(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    toast('success', 'Pedido eliminado.')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/fabric-requests', {
      reference: form.reference,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      development_id: form.development_id ? Number(form.development_id) : null,
      color: form.color || null,
      quantity_meters: form.quantity_meters ? Number(form.quantity_meters) : null,
      article: form.article || null,
      composition: form.composition || null,
      width: form.width || null,
      grammage: form.grammage || null,
      price_per_meter: form.price_per_meter ? Number(form.price_per_meter) : null,
      leadtime: form.leadtime || null,
      requested_at: form.requested_at || null,
      notes: form.notes || null,
      cover_url: form.cover_url || null,
    })
    setCreating(false)
    setForm(EMPTY_FORM)
    toast('success', 'Pedido de malha registado.')
    void load()
  }

  return <div className="content-page">
    <div className="page-heading">
      <div>
        <h1>Malhas</h1>
        <p>{pendingCount} pedidos em curso · {reminderCount} à espera há 5+ dias. Os mais atrasados aparecem primeiro.</p>
      </div>
      <button className="primary-button" onClick={() => setCreating(true)}>+ Pedir malha</button>
    </div>
    <div className="filter-bar">
      <Scroll size={16}/>
      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="">Todos os estados</option>
        {data.statuses.map(status => <option key={status} value={status}>{FABRIC_STATUS_NAMES[status] || status}</option>)}
      </select>
      <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
        <option value="">Todos os fornecedores</option>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {(statusFilter || supplierFilter) && <button className="clear-filters" onClick={() => { setStatusFilter(''); setSupplierFilter('') }}>Limpar</button>}
    </div>
    <div className="fabric-list">
      {visible.map(item => <article className={`fabric-row ${item.needs_reminder ? 'reminder' : ''}`} key={item.id}>
        {item.cover_url ? <img src={item.cover_url} alt=""/> : <div className="fabric-thumb"><Scroll size={19}/></div>}
        <div className="fabric-main">
          <strong>{item.reference}{item.color ? ` · ${item.color}` : ''}</strong>
          <span>{[item.article, item.composition, item.grammage ? `${item.grammage} g` : null, item.width ? `${item.width} m` : null].filter(Boolean).join(' · ') || 'Sem ficha'}</span>
          <span>{item.development_code ? `Modelo ${item.development_code}` : 'Sem modelo associado'}{item.supplier_name ? ` · ${item.supplier_name}` : ''}</span>
          {item.notes && <em>{item.notes}</em>}
        </div>
        <div className="fabric-side">
          {item.days_pending != null && <span className={`risk-pill ${item.needs_reminder ? 'high' : 'medium'}`}>
            {item.needs_reminder && <AlertTriangle size={13}/>}{item.days_pending} d à espera
          </span>}
          {item.days_to_receive != null && <span className="risk-pill low">recebida em {item.days_to_receive} d</span>}
          {(item.quantity_meters || item.price_per_meter) && <small>
            {item.quantity_meters ? `${item.quantity_meters} mts` : ''}{item.quantity_meters && item.price_per_meter ? ' · ' : ''}{item.price_per_meter ? `${item.price_per_meter.toFixed(2)} €/mt` : ''}{item.leadtime ? ` · ${item.leadtime}` : ''}
          </small>}
          <div className="fabric-actions">
            <select className="status-select" value={item.development_id ?? ''} onChange={e => void linkDevelopment(item.id, e.target.value)} title="Modelo associado">
              <option value="">Sem modelo</option>
              {developments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
            <select className="status-select" value={item.status} onChange={e => void updateStatus(item.id, e.target.value)}>
              {data.statuses.map(status => <option key={status} value={status}>{FABRIC_STATUS_NAMES[status] || status}</option>)}
            </select>
            <button className="danger" onClick={() => void remove(item.id)}><Trash2 size={15}/></button>
          </div>
        </div>
        <span className={`chip tone-${STATUS_TONES[item.status] || 'lilac'} fabric-status`}>{FABRIC_STATUS_NAMES[item.status] || item.status}</span>
      </article>)}
      {visible.length === 0 && <p className="empty-note">Sem pedidos de malha para estes filtros.</p>}
    </div>
    {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
      <form className="create-modal wide" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setCreating(false)}><X/></button>
        <h2>Pedir malha</h2>
        <p>Referência e fornecedor chegam para registar. O resto completa-se quando a etiqueta chegar.</p>
        <div className="form-grid">
          <label>Referência *<input required value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="NWJ 7986/B"/></label>
          <label>Fornecedor<select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">Selecionar...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
          <label>Modelo (opcional)<select value={form.development_id} onChange={e => setForm({ ...form, development_id: e.target.value })}>
            <option value="">Sem modelo</option>
            {developments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
          </select></label>
          <label>Cor<input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="cor de cartaz"/></label>
          <label>Metros<input type="number" step="0.5" min="0" value={form.quantity_meters} onChange={e => setForm({ ...form, quantity_meters: e.target.value })} placeholder="4"/></label>
          <label>Artigo<input value={form.article} onChange={e => setForm({ ...form, article: e.target.value })} placeholder="JERSEY"/></label>
          <label>Composição<input value={form.composition} onChange={e => setForm({ ...form, composition: e.target.value })} placeholder="CO/PES"/></label>
          <label>Gramagem<input value={form.grammage} onChange={e => setForm({ ...form, grammage: e.target.value })} placeholder="190"/></label>
          <label>Largura<input value={form.width} onChange={e => setForm({ ...form, width: e.target.value })} placeholder="1.50"/></label>
          <label>Preço €/mt<input type="number" step="0.01" min="0" value={form.price_per_meter} onChange={e => setForm({ ...form, price_per_meter: e.target.value })}/></label>
          <label>Leadtime<input value={form.leadtime} onChange={e => setForm({ ...form, leadtime: e.target.value })} placeholder="4-5 semanas"/></label>
          <label>Data do pedido<input type="date" value={form.requested_at} onChange={e => setForm({ ...form, requested_at: e.target.value })}/></label>
        </div>
        <label>Notas<input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="pedido por whatsapp: 4 mts na cor de cartaz"/></label>
        <UploadInput value={form.cover_url} onChange={url => setForm({ ...form, cover_url: url })} label="Fotografia da malha / etiqueta"/>
        <button className="primary-button" type="submit">Registar pedido</button>
      </form>
    </div>}
  </div>
}
