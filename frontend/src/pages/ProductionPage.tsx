import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CalendarDays, Package, Trash2, UserRound, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Client, Production } from '../types'

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
      <div className="card-title">{item.development_code || item.title}</div>
      {item.development_code && item.title && <div className="card-subtitle">{item.title}</div>}
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
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  const [clientsList, setClientsList] = useState<Client[]>([])
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [view, setView] = useState<'fase' | 'cliente'>('fase')
  const [selected, setSelected] = useState<Production | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  useEffect(() => {
    void api.get<Response>('/productions').then(setData)
    api.get<Client[]>('/clients').then(setClientsList)
  }, [])

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
    const updated = await api.patch<Production>(`/productions/${id}`, payload)
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
    setSelected(current => current?.id === id ? updated : current)
    if (message) toast('success', message)
    return updated
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

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || view !== 'fase') return
    const item = event.active.data.current as Production
    const status = String(event.over.id)
    if (item.status !== status) void move(item.id, status)
  }

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>Produções</h1>
        <p>{view === 'fase' ? 'Arraste pelas fases. Clique abre a ficha.' : 'Vista por cliente, como o quadro do Trello. Clique abre a ficha.'}</p>
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
      <div className="create-modal fabric-detail" onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setSelected(null)}><X/></button>
        <h2>{selected.development_code || selected.title}</h2>
        <p>{selected.title && selected.development_code ? selected.title : ''}{selected.title && selected.development_code ? ' · ' : ''}{selected.client_name}</p>
        <label>Estado<select value={selected.status} onChange={e => void patchProduction(selected.id, { status: e.target.value }, 'Estado atualizado.')}>
          {data.stages.map(stage => <option key={stage} value={stage}>{STAGE_NAMES[stage] || stage}</option>)}
        </select></label>
        <label>Cliente<select value={clientsList.find(c => c.name === selected.client_name)?.id ?? ''} onChange={e => void patchProduction(selected.id, { client_id: e.target.value ? Number(e.target.value) : null }, 'Cliente atualizado.')}>
          <option value="">—</option>
          {clientsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select></label>
        <label>Quantidade<input type="number" min="0" defaultValue={selected.quantity} onBlur={e => { const v = Number(e.target.value); if (v !== selected.quantity) void patchProduction(selected.id, { quantity: v }, 'Quantidade atualizada.') }}/></label>
        <label>Prazo<input type="date" defaultValue={selected.due_date || ''} onChange={e => void patchProduction(selected.id, { due_date: e.target.value || null }, 'Prazo atualizado.')}/></label>
        <label>Responsável<input defaultValue={selected.responsible_name || ''} onBlur={e => { if (e.target.value !== (selected.responsible_name || '')) void patchProduction(selected.id, { responsible_name: e.target.value || null }, 'Responsável atualizado.') }}/></label>
        <button className="action danger" onClick={() => void removeProduction(selected.id)}><Trash2 size={15}/> Eliminar produção</button>
      </div>
    </div>}
  </div>
}
