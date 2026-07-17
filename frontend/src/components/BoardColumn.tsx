import { useDroppable } from '@dnd-kit/core'
import type { Development } from '../types'
import { DevelopmentCard } from './DevelopmentCard'

export function BoardColumn({ id, title, items, onOpen }: { id: string; title: string; items: Development[]; onOpen: (item: Development) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span><button>•••</button></div>
    <div className="column-cards">{items.map(item => <DevelopmentCard key={item.id} item={item} onOpen={() => onOpen(item)}/>)}</div>
    <button className="add-card">+ Adicionar cartão</button>
  </section>
}
