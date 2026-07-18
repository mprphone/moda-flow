import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CalendarDays, Layers3, MessageCircle, Package, Scroll, StickyNote, Trash2, UserRound, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { toast } from '../lib/toast'
import { StageTrace } from '../components/StageTrace'
import { FABRIC_STATUS_NAMES } from './FabricsPage'
import { STAGE_LABELS as STAGE_LABELS_DEV } from '../constants/pipeline'
import type { Client, Development, FabricRequest, Production, ProductionDetail } from '../types'

type Response = { stages: string[]; items: Production[] }

const STAGE_NAMES: Record<string, string> = {
  encomenda_recebida: 'Encomenda recebida',
  materiais: 'Materiais',
  corte: 'Corte',
  confecao: 'Confeção',
  controlo_qualidade: 'Controlo qualidade',
  expedida: 'Expedida',
  cancelada: 'Cancelada',
}

function ProductionCard({ item, showStatus, onOpen }: { item: Production; showStatus?: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className="development-card production-card" {...listeners} {...attributes} onClick={onOpen}>
    <div className="card-body">
      <div className="card-title">{item.title || item.development_code}</div>
      {item.development_code && <div className="card-subtitle">Origem: {item.development_code}</div>}
      <div className="card-subtitle">{item.client_name}</div>
      {showStatus && <div className="chips"><span className="chip tone-sky">{STAGE_NAMES[item.status] || item.status}</span></div>}
      <div className="production-meta">
        {item.quantity > 0 && <span><Package size={13}/>{item.quantity} un.</span>}
        {item.due_date && <span><CalendarDays size={13}/>{item.due_date}</span>}
        {item.responsible_name && <span><UserRound size={13}/>{item.responsible_name}</span>}
      </div>
    </div>
  </article>
}

function ProductionColumn({ id, title, items, showStatus, onOpen }: { id: string; title: string; items: Production[]; showStatus?: boolean; onOpen: (item: Production) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [limit, setLimit] = useState(25)
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{items.slice(0, limit).map(item => <ProductionCard key={item.id} item={item} showStatus={showStatus} onOpen={() => onOpen(item)}/>)}</div>
    {items.length > limit && <button className="add-card" onClick={() => setLimit(v => v + 100)}>Mostrar mais {items.length - limit} cartões...</button>}
  </section>
}

export function ProductionPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  const [clientsList, setClientsList] = useState<Client[]>([])
  const [developments, setDevelopments] = useState<Development[]>([])
  const [fabrics, setFabrics] = useState<FabricRequest[]>([])
  const [newFabricId, setNewFabricId] = useState('')
  const [usageStatus, setUsageStatus] = useState('used')
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [view, setView] = useState<'fase' | 'cliente'>('fase')
  const [selected, setSelected] = useState<Production | null>(null)
  const [detail, setDetail] = useState<ProductionDetail | null>(null)
  const [notes, setNotes] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  useEffect(() => {
    void api.get<Response>('/productions').then(setData)
    api.get<Client[]>('/clients').then(setClientsList)
    api.get<Development[]>('/developments').then(setDevelopments)
    api.get<{ items: FabricRequest[] }>('/fabric-requests').then(result => setFabrics(result.items))
  }, [])

  useEffect(() => {
    if (!selected) { setDetail(null); return }
    api.get<ProductionDetail>(`/productions/${selected.id}`).then(d => { setDetail(d); setNotes(d.description || '') }).catch(() => setDetail(null))
  }, [selected?.id])

  // Fases da rastreabilidade (o pipeline, sem o estado terminal "cancelada")
  const traceStages = useMemo<[string, string][]>(
    () => data.stages.filter(s => s !== 'cancelada').map(s => [s, STAGE_NAMES[s] || s]),
    [data.stages],
  )

  const clients = useMemo(() => [...new Set(data.items.map(item => item.client_name))].sort(), [data])

  const visible = useMemo(() => data.items.filter(item => {
    const text = `${item.development_code || ''} ${item.title || ''} ${item.client_name}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (clientFilter && item.client_name !== clientFilter) return false
    return true
  }), [data, query, clientFilter])

  // Colunas por fase (pipeline) ou por cliente (como o quadro PRODUÇÕES do Trello)
  const columns = useMemo(() => view === 'fase'
    ? data.stages.map(stage => ({ id: stage, title: STAGE_NAMES[stage] || stage }))
    : clients.map(name => ({ id: name, title: name })),
  [view, data.stages, clients])

  const grouped = useMemo(
    () => Object.fromEntries(columns.map(column => [column.id, visible.filter(item => view === 'fase' ? item.status === column.id : item.client_name === column.id)])),
    [columns, visible, view],
  )

  async function patchProduction(id: number, payload: Record<string, unknown>, message?: string) {
    const updated = await api.patch<ProductionDetail>(`/productions/${id}`, payload)
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, ...updated } : item) }))
    setSelected(current => current?.id === id ? { ...current, ...updated } : current)
    if (updated.stage_history) setDetail(current => current?.id === id ? updated : current)
    if (message) toast('success', message)
    return updated
  }

  async function saveStageNote(id: number, stage: string, note: string) {
    const updated = await api.put<ProductionDetail>(`/productions/${id}/stage-notes`, { stage, note: note || null })
    setDetail(current => current?.id === id ? updated : current)
    toast('success', 'Nota da fase guardada.')
  }

  async function saveDescription(id: number) {
    setSaving(true)
    try {
      await patchProduction(id, { description: notes.trim() || null }, 'Notas guardadas.')
    } finally { setSaving(false) }
  }

  async function submitComment(id: number) {
    const body = comment.trim()
    if (!body) return
    setSaving(true)
    try {
      await api.post(`/productions/${id}/comments`, { body, author: user?.name || 'Utilizador' })
      setComment('')
      const d = await api.get<ProductionDetail>(`/productions/${id}`)
      setDetail(d)
      toast('success', 'Comentário registado.')
    } finally { setSaving(false) }
  }

  async function move(id: number, status: string) {
    const previous = data
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, status } : item) }))
    try {
      await patchProduction(id, { status }, `Produção em "${STAGE_NAMES[status] || status}".`)
    } catch {
      setData(previous)
    }
  }

  async function removeProduction(id: number) {
    if (!window.confirm('Eliminar esta produção?')) return
    await api.del(`/productions/${id}`)
    setData(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    setSelected(null)
    toast('success', 'Produção eliminada.')
  }

  async function addFabric(id: number) {
    if (!newFabricId) return
    const updated = await api.post<ProductionDetail>(`/productions/${id}/fabrics`, { fabric_request_id: Number(newFabricId), usage_status: usageStatus })
    setDetail(updated); setNewFabricId('')
    toast('success', 'Malha ligada à produção.')
  }

  async function removeFabric(id: number, linkId: number) {
    await api.del(`/productions/${id}/fabrics/${linkId}`)
    setDetail(await api.get<ProductionDetail>(`/productions/${id}`))
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || view !== 'fase') return
    const item = event.active.data.current as Production
    const status = String(event.over.id)
    if (item.status !== status) void move(item.id, status)
  }

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>Produções industriais</h1>
        <p>{view === 'fase' ? 'Encomendas em produção. Arraste pelas fases. Clique abre a ficha.' : 'Vista por cliente. Clique abre a ficha.'}</p>
      </div>
    </div>
    <div className="phase-tabs">
      <button className={view === 'fase' ? 'active' : ''} onClick={() => setView('fase')}>Por fase</button>
      <button className={view === 'cliente' ? 'active' : ''} onClick={() => { setView('cliente'); setClientFilter('') }}>Por cliente</button>
    </div>
    <div className="filter-bar">
      <input placeholder="Pesquisar modelo ou referência..." value={query} onChange={e => setQuery(e.target.value)}/>
      {view === 'fase' && <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
        <option value="">Todos os clientes</option>
        {clients.map(name => <option key={name} value={name}>{name}</option>)}
      </select>}
      {(query || clientFilter) && <button className="clear-filters" onClick={() => { setQuery(''); setClientFilter('') }}>Limpar</button>}
    </div>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {columns.map(column => <ProductionColumn key={`${view}-${column.id}`} id={column.id} title={column.title} items={grouped[column.id] || []} showStatus={view === 'cliente'} onOpen={setSelected}/>)}
      </div>
    </DndContext>
    {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
      <div className="modal-card production-detail-card" onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setSelected(null)}><X/></button>
        <div className="modal-main">
          <div className="modal-content">
            <div className="eyebrow">{selected.client_name} · Produção industrial</div>
            <h2>{selected.development_code || selected.title}{selected.development_code && selected.title ? ` — ${selected.title}` : ''}</h2>
            <div className="production-form-grid">
              <label>Estado<select value={selected.status} onChange={e => void patchProduction(selected.id, { status: e.target.value }, 'Estado atualizado.')}>
                {data.stages.map(stage => <option key={stage} value={stage}>{STAGE_NAMES[stage] || stage}</option>)}
              </select></label>
              <label>Cliente<select value={selected.client_id ?? clientsList.find(c => c.name === selected.client_name)?.id ?? ''} onChange={e => void patchProduction(selected.id, { client_id: e.target.value ? Number(e.target.value) : null }, 'Cliente atualizado.')}>
                <option value="">—</option>
                {clientsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
              <label>Quantidade<input type="number" min="0" defaultValue={selected.quantity} onBlur={e => { const v = Number(e.target.value); if (v !== selected.quantity) void patchProduction(selected.id, { quantity: v }, 'Quantidade atualizada.') }}/></label>
              <label>Prazo<input type="date" defaultValue={selected.due_date || ''} onChange={e => void patchProduction(selected.id, { due_date: e.target.value || null }, 'Prazo atualizado.')}/></label>
              <label>Responsável<input defaultValue={selected.responsible_name || ''} onBlur={e => { if (e.target.value !== (selected.responsible_name || '')) void patchProduction(selected.id, { responsible_name: e.target.value || null }, 'Responsável atualizado.') }}/></label>
            </div>
            <section className="history-section">
              <div className="section-title"><Layers3 size={18}/><strong>Desenvolvimento de origem</strong></div>
              <select className="status-select cross-select" value={selected.development_id ?? ''} onChange={e => void patchProduction(selected.id, { development_id: e.target.value ? Number(e.target.value) : null }, 'Ligação atualizada.')}>
                <option value="">Sem desenvolvimento associado</option>
                {developments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
              </select>
              {detail?.development && <div className="cross-link">
                {detail.development.code} — {detail.development.title}
                <span className="chip tone-sky">{STAGE_LABELS_DEV[detail.development.current_stage] || detail.development.current_stage}</span>
              </div>}
            </section>
            <section className="history-section">
              <div className="section-title"><Scroll size={18}/><strong>Malhas usadas nesta produção</strong></div>
              <div className="history-list">{(detail?.used_fabrics || []).map(f => <div className="history-row" key={f.link_id}>
                <strong>{f.reference}{f.color ? ` · ${f.color}` : ''}</strong>
                <span>{f.usage_status} {f.supplier_name ? `· ${f.supplier_name}` : ''} <button type="button" className="clear-filters" onClick={() => void removeFabric(selected.id, f.link_id)}>Remover</button></span>
              </div>)}</div>
              <div className="production-form-grid">
                <label>Malha<select value={newFabricId} onChange={e => setNewFabricId(e.target.value)}><option value="">Selecionar...</option>{fabrics.filter(f => !(detail?.used_fabrics || []).some(u => u.id === f.id)).map(f => <option key={f.id} value={f.id}>{f.reference}{f.color ? ` · ${f.color}` : ''}</option>)}</select></label>
                <label>Utilização<select value={usageStatus} onChange={e => setUsageStatus(e.target.value)}><option value="used">Usada</option><option value="approved">Aprovada</option><option value="candidate">Candidata</option><option value="alternative">Alternativa</option><option value="rejected">Rejeitada</option></select></label>
              </div>
              <button type="button" className="secondary-button" disabled={!newFabricId} onClick={() => void addFabric(selected.id)}>Adicionar malha</button>
            </section>
            {detail && detail.fabric_requests.length > 0 && <section className="history-section">
              <div className="section-title"><Scroll size={18}/><strong>Malhas deste modelo</strong></div>
              <div className="history-list">{detail.fabric_requests.map(f => <div className="history-row" key={f.id}>
                <strong>{f.reference}{f.color ? ` · ${f.color}` : ''}{f.supplier_name ? ` — ${f.supplier_name}` : ''}</strong>
                <span>{FABRIC_STATUS_NAMES[f.status] || f.status}{f.days_pending != null ? ` · há ${f.days_pending} d` : ''}{f.needs_reminder ? ' · ⚠ relançar' : ''}</span>
              </div>)}</div>
            </section>}
            <section className="history-section notes-section">
              <div className="section-title"><StickyNote size={18}/><strong>Notas</strong></div>
              <textarea placeholder="Descrição, materiais, instruções de produção..." value={notes} onChange={e => setNotes(e.target.value)}/>
              {notes.trim() !== (selected.description || '').trim() && <div className="notes-actions">
                <button disabled={saving} onClick={() => void saveDescription(selected.id)}>Guardar notas</button>
              </div>}
            </section>
            <section className="history-section">
              <StageTrace
                stages={traceStages}
                history={detail?.stage_history || []}
                onSaveNote={(stage, note) => saveStageNote(selected.id, stage, note)}
              />
            </section>
            <section className="history-section">
              <div className="section-title"><MessageCircle size={18}/><strong>Comentários</strong></div>
              <div className="comment-box">
                <textarea placeholder="Escrever um comentário..." value={comment} onChange={e => setComment(e.target.value)}/>
                <button disabled={saving || !comment.trim()} onClick={() => void submitComment(selected.id)}>Comentar</button>
              </div>
              <div className="history-list">{(detail?.comments || []).map(c => <div className="comment-row" key={c.id}>
                <strong>{c.author}</strong>
                <span>{c.body}</span>
                <small>{new Date(c.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
              </div>)}</div>
            </section>
          </div>
          <aside className="modal-side">
            <h3>Ações rápidas</h3>
            <div className="mini-note">Arraste o cartão ou mude o estado para avançar a produção. Cada mudança regista o tempo na fase.</div>
            <button className="action danger" onClick={() => void removeProduction(selected.id)}><Trash2 size={15}/> Eliminar produção</button>
          </aside>
        </div>
      </div>
    </div>}
  </div>
}
