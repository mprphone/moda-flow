import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core'
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
}

function ProductionCard({ item }: { item: Production }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className="development-card production-card" {...listeners} {...attributes}>
    <div className="card-body">
      <div className="card-title">{item.development_code}</div>
      <div className="card-subtitle">{item.client_name}</div>
      <div className="production-meta">
        <span><Package size={13}/>{item.quantity} un.</span>
        {item.due_date && <span><CalendarDays size={13}/>{item.due_date}</span>}
        {item.responsible_name && <span><UserRound size={13}/>{item.responsible_name}</span>}
      </div>
    </div>
  </article>
}

function ProductionColumn({ id, title, items }: { id: string; title: string; items: Production[] }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{items.map(item => <ProductionCard key={item.id} item={item}/>)}</div>
  </section>
}

export function ProductionPage() {
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  useEffect(() => { void api.get<Response>('/productions').then(setData) }, [])

  const grouped = useMemo(
    () => Object.fromEntries(data.stages.map(stage => [stage, data.items.filter(item => item.status === stage)])),
    [data],
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
    <DndContext onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {data.stages.map(stage => <ProductionColumn key={stage} id={stage} title={STAGE_NAMES[stage] || stage} items={grouped[stage] || []}/>)}
      </div>
    </DndContext>
  </div>
}
