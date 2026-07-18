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

function ProductionCard({ item }: { item: Production }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className="development-card production-card" {...listeners} {...attributes}>
    <div className="card-body">
      <div className="card-title">{item.development_code || item.title}</div>
      {item.development_code && item.title && <div className="card-subtitle">{item.title}</div>}
      <div className="card-subtitle">{item.client_name}</div>
      <div className="production-meta">
        {item.quantity > 0 && <span><Package size={13}/>{item.quantity} un.</span>}
        {item.due_date && <span><CalendarDays size={13}/>{item.due_date}</span>}
        {item.responsible_name && <span><UserRound size={13}/>{item.responsible_name}</span>}
      </div>
    </div>
  </article>
}

function ProductionColumn({ id, title, items }: { id: string; title: string; items: Production[] }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [limit, setLimit] = useState(25)
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{items.slice(0, limit).map(item => <ProductionCard key={item.id} item={item}/>)}</div>
    {items.length > limit && <button className="add-card" onClick={() => setLimit(v => v + 100)}>Mostrar mais {items.length - limit} cartões...</button>}
  </section>
}

export function ProductionPage() {
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  useEffect(() => { void api.get<Response>('/productions').then(setData) }, [])

  const clients = useMemo(() => [...new Set(data.items.map(item => item.client_name))].sort(), [data])

  const visible = useMemo(() => data.items.filter(item => {
    const text = `${item.development_code || ''} ${item.title || ''} ${item.client_name}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (clientFilter && item.client_name !== clientFilter) return false
    return true
  }), [data, query, clientFilter])

  const grouped = useMemo(
    () => Object.fromEntries(data.stages.map(stage => [stage, visible.filter(item => item.status === stage)])),
    [data.stages, visible],
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
    if (!event.over) return
    const item = event.active.data.current as Production
    const status = String(event.over.id)
    if (item.status !== status) void move(item.id, status)
  }

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>Pipeline de produções</h1>
        <p>Arraste cada produção pelas fases. As produções nascem da amostra aprovada no quadro de desenvolvimento.</p>
      </div>
    </div>
    <div className="filter-bar">
      <input placeholder="Pesquisar modelo ou referência..." value={query} onChange={e => setQuery(e.target.value)}/>
      <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
        <option value="">Todos os clientes</option>
        {clients.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      {(query || clientFilter) && <button className="clear-filters" onClick={() => { setQuery(''); setClientFilter('') }}>Limpar</button>}
    </div>
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {data.stages.map(stage => <ProductionColumn key={stage} id={stage} title={STAGE_NAMES[stage] || stage} items={grouped[stage] || []}/>)}
      </div>
    </DndContext>
  </div>
}
