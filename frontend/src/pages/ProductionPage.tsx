import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { CalendarDays, Package, UserRound } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Production } from '../types'

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

function ProductionCard({ item, showStatus }: { item: Production; showStatus?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className="development-card production-card" {...listeners} {...attributes}>
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

function ProductionColumn({ id, title, items, showStatus }: { id: string; title: string; items: Production[]; showStatus?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [limit, setLimit] = useState(25)
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{items.slice(0, limit).map(item => <ProductionCard key={item.id} item={item} showStatus={showStatus}/>)}</div>
    {items.length > limit && <button className="add-card" onClick={() => setLimit(v => v + 100)}>Mostrar mais {items.length - limit} cartões...</button>}
  </section>
}

export function ProductionPage() {
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [view, setView] = useState<'fase' | 'cliente'>('fase')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  useEffect(() => { void api.get<Response>('/productions').then(setData) }, [])

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

  async function move(id: number, status: string) {
    const previous = data
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? { ...item, status } : item) }))
    try {
      const updated = await api.patch<Production>(`/productions/${id}`, { status })
      setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
      toast('success', `Produção em "${STAGE_NAMES[status] || status}".`)
    } catch {
      setData(previous)
    }
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
        <p>{view === 'fase' ? 'Arraste cada produção pelas fases.' : 'Vista por cliente, como o quadro do Trello. O estado está no cartão.'}</p>
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
        {columns.map(column => <ProductionColumn key={`${view}-${column.id}`} id={column.id} title={column.title} items={grouped[column.id] || []} showStatus={view === 'cliente'}/>)}
      </div>
    </DndContext>
  </div>
}
