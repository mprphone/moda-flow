import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { Development } from '../types'
import { DevelopmentCard } from './DevelopmentCard'

const PAGE = 25

export function BoardColumn({ id, title, items, onOpen, showStage }: { id: string; title: string; items: Development[]; onOpen: (item: Development) => void; showStage?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [limit, setLimit] = useState(PAGE)
  const visible = items.slice(0, limit)
  return <section ref={setNodeRef} className={`board-column ${isOver ? 'is-over' : ''}`}>
    <div className="column-header"><strong>{title}</strong><span>{items.length}</span></div>
    <div className="column-cards">{visible.map(item => <DevelopmentCard key={item.id} item={item} onOpen={() => onOpen(item)} showStage={showStage}/>)}</div>
    {items.length > limit && <button className="add-card" onClick={() => setLimit(v => v + PAGE * 4)}>Mostrar mais {items.length - limit} cartões...</button>}
  </section>
}
