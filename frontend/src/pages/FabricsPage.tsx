import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { AlertTriangle, Clock3, Scroll, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import { UploadInput } from '../components/UploadInput'
import { LabelPicker } from '../components/LabelPicker'
import type { Development, FabricRequest, Label, Supplier } from '../types'

type Response = { statuses: string[]; items: FabricRequest[] }

export const FABRIC_STATUS_NAMES: Record<string, string> = {
  pedido: 'Pedido',
  envio_em_curso: 'Envio em curso',
  recebida: 'Recebida',
  tingimento: 'Tingimento',
  cancelada: 'Cancelada',
}

const EMPTY_FORM = {
  reference: '', supplier_id: '', development_id: '', color: '', quantity_meters: '',
  article: '', composition: '', width: '', grammage: '', price_per_meter: '', leadtime: '',
  requested_at: '', notes: '', cover_url: '',
}

const STATUS_TONES: Record<string, string> = {
  pedido: 'yellow',
  envio_em_curso: 'sky',
  recebida: 'mint',
  tingimento: 'lilac',
  cancelada: 'pink',
}

function FabricCard({ item, onOpen, showStatus }: { item: FabricRequest; onOpen: () => void; showStatus?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className={`development-card ${item.needs_reminder ? 'risk-high' : ''}`} {...listeners} {...attributes} onClick={onOpen}>
    {item.cover_url && <img src={item.cover_url} alt="" className="card-cover"/>}
    <div className="card-body">
      <div className="card-title">{item.reference}</div>
      {item.color && <div className="card-subtitle">{item.color}</div>}
      <div className="chips">
        {showStatus
          ? <span className={`chip tone-${STATUS_TONES[item.status] || 'lilac'}`}>{FABRIC_STATUS_NAMES[item.status] || item.status}</span>
          : item.supplier_name && <span className="chip tone-lilac">{item.supplier_name}</span>}
        {item.development_code && <span className="chip tone-sky">{item.development_code}</span>}
        {item.labels.map(label => <span key={label.id} className={`chip tone-${label.tone}`}>{label.name}</span>)}
      </div>
      <div className="card-footer">
        {item.days_pending != null && <span className={item.needs_reminder ? 'eta-risk' : ''}>
          {item.needs_reminder ? <AlertTriangle size={14}/> : <Clock3 size={14}/>}{item.days_pending} d à espera
        </span>}
        {item.days_to_receive != null && <span><Clock3 size={14}/>recebida em {item.days_to_receive} d</span>}
        {item.quantity_meters ? <b>{item.quantity_meters} m</b> : null}
      </div>
    </div>
  </article>
}

function FabricColumn({ id, title, items, onOpen, showStatus }: { id: string; title: string; items: FabricRequest[]; onOpen: (item: FabricRequest) => void; showStatus?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [limit, setLimit] = useState(20)
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{items.slice(0, limit).map(item => <FabricCard key={item.id} item={item} onOpen={() => onOpen(item)} showStatus={showStatus}/>)}</div>
    {items.length > limit && <button className="add-card" onClick={() => setLimit(v => v + 100)}>Mostrar mais {items.length - limit} cartões...</button>}
  </section>
}

export function FabricsPage() {
  const [data, setData] = useState<Response>({ statuses: [], items: [] })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [developments, setDevelopments] = useState<Development[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [query, setQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
  const [view, setView] = useState<'estado' | 'fornecedor'>('estado')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<FabricRequest | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // O arrasto só arma após 6px de movimento — o clique simples abre o cartão.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const load = () => api.get<Response>('/fabric-requests').then(setData)
  useEffect(() => {
    void load()
    api.get<Supplier[]>('/suppliers').then(setSuppliers)
    api.get<Development[]>('/developments').then(setDevelopments)
    api.get<Label[]>('/labels?scope=fabric').then(setLabels)
  }, [])

  const visible = useMemo(() => data.items.filter(item => {
    const text = `${item.reference} ${item.color || ''} ${item.supplier_name || ''} ${item.development_code || ''}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (supplierFilter && String(item.supplier_id) !== supplierFilter) return false
    if (labelFilter && !item.labels.some(label => String(label.id) === labelFilter)) return false
    return true
  }), [data, query, supplierFilter, labelFilter])

  // Colunas: por estado (pipeline) ou por fornecedor (como no Trello)
  const columns = useMemo(() => {
    if (view === 'estado') {
      return data.statuses.map(status => ({ id: status, title: FABRIC_STATUS_NAMES[status] || status }))
    }
    return [{ id: 'none', title: 'Sem fornecedor' }, ...suppliers.map(s => ({ id: String(s.id), title: s.name }))]
  }, [view, data.statuses, suppliers])

  const grouped = useMemo(() => Object.fromEntries(columns.map(column => {
    const items = visible.filter(item => view === 'estado'
      ? item.status === column.id
      : String(item.supplier_id ?? 'none') === column.id)
    items.sort((a, b) => (b.days_pending ?? -1) - (a.days_pending ?? -1))
    return [column.id, items]
  })), [columns, visible, view])

  const pendingCount = data.items.filter(item => item.days_pending != null).length
  const reminderCount = data.items.filter(item => item.needs_reminder).length

  async function patchItem(id: number, payload: Record<string, unknown>, message?: string) {
    const updated = await api.patch<FabricRequest>(`/fabric-requests/${id}`, payload)
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
    setSelected(current => current?.id === id ? updated : current)
    if (message) toast('success', message)
    return updated
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return
    const item = event.active.data.current as FabricRequest
    const target = String(event.over.id)
    const previous = data
    if (view === 'estado') {
      if (item.status === target) return
      setData(current => ({ ...current, items: current.items.map(i => i.id === item.id ? { ...i, status: target } : i) }))
      patchItem(item.id, { status: target }, `Malha em "${FABRIC_STATUS_NAMES[target] || target}".`).catch(() => setData(previous))
    } else {
      const supplierId = target === 'none' ? null : Number(target)
      if ((item.supplier_id ?? null) === supplierId) return
      const supplierName = suppliers.find(s => s.id === supplierId)?.name
      setData(current => ({ ...current, items: current.items.map(i => i.id === item.id ? { ...i, supplier_id: supplierId ?? undefined, supplier_name: supplierName } : i) }))
      patchItem(item.id, { supplier_id: supplierId }, supplierName ? `Malha atribuída a ${supplierName}.` : 'Fornecedor removido.').catch(() => setData(previous))
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Eliminar este pedido de malha?')) return
    await api.del(`/fabric-requests/${id}`)
    setData(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    setSelected(null)
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

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>Malhas</h1>
        <p>{pendingCount} em curso · {reminderCount} há 5+ dias sem chegar ⚠. Clique abre o cartão; arraste para mover.</p>
      </div>
      <button className="primary-button" onClick={() => setCreating(true)}>+ Pedir malha</button>
    </div>
    <div className="phase-tabs">
      <button className={view === 'estado' ? 'active' : ''} onClick={() => setView('estado')}>Por estado</button>
      <button className={view === 'fornecedor' ? 'active' : ''} onClick={() => { setView('fornecedor'); setSupplierFilter('') }}>Por fornecedor</button>
    </div>
    <div className="filter-bar">
      <Scroll size={16}/>
      <input placeholder="Pesquisar referência, cor, modelo..." value={query} onChange={e => setQuery(e.target.value)}/>
      {view === 'estado' && <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}>
        <option value="">Todos os fornecedores</option>
        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>}
      <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)}>
        <option value="">Todas as etiquetas</option>
        {labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}
      </select>
      {(query || supplierFilter || labelFilter) && <button className="clear-filters" onClick={() => { setQuery(''); setSupplierFilter(''); setLabelFilter('') }}>Limpar</button>}
    </div>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {columns.map(column => <FabricColumn key={`${view}-${column.id}`} id={column.id} title={column.title} items={grouped[column.id] || []} onOpen={setSelected} showStatus={view === 'fornecedor'}/>)}
      </div>
    </DndContext>
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
      <div className="create-modal fabric-detail" onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setSelected(null)}><X/></button>
        {selected.cover_url && <img className="fabric-detail-photo" src={selected.cover_url} alt=""/>}
        <h2>{selected.reference}{selected.color ? ` · ${selected.color}` : ''}</h2>
        <p>{[selected.article, selected.composition, selected.grammage ? `${selected.grammage} g` : null, selected.width ? `${selected.width} m` : null].filter(Boolean).join(' · ') || 'Sem ficha da etiqueta'}
          {selected.quantity_meters ? ` — ${selected.quantity_meters} metros` : ''}{selected.price_per_meter ? ` — ${selected.price_per_meter.toFixed(2)} €/mt` : ''}{selected.leadtime ? ` — ${selected.leadtime}` : ''}</p>
        {selected.notes && <p className="fabric-notes">{selected.notes}</p>}
        <LabelPicker all={labels} applied={selected.labels} onChange={(ids) => void patchItem(selected.id, { label_ids: ids })}/>
        <label>Estado<select value={selected.status} onChange={e => void patchItem(selected.id, { status: e.target.value }, 'Estado atualizado.')}>
          {data.statuses.map(status => <option key={status} value={status}>{FABRIC_STATUS_NAMES[status] || status}</option>)}
        </select></label>
        <label>Fornecedor<select value={selected.supplier_id ?? ''} onChange={e => void patchItem(selected.id, { supplier_id: e.target.value ? Number(e.target.value) : null }, 'Fornecedor atualizado.')}>
          <option value="">Sem fornecedor</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
        <label>Modelo associado<select value={selected.development_id ?? ''} onChange={e => void patchItem(selected.id, { development_id: e.target.value ? Number(e.target.value) : null }, 'Modelo atualizado.')}>
          <option value="">Sem modelo</option>
          {developments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select></label>
        <button className="action danger" onClick={() => void remove(selected.id)}><Trash2 size={15}/> Eliminar pedido</button>
      </div>
    </div>}
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
