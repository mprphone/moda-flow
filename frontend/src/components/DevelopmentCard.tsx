import { Clock3, MessageCircle, Sparkles } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import type { Development } from '../types'

export function DevelopmentCard({ item, onOpen }: { item: Development; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id, data: item })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return <article ref={setNodeRef} style={style} className={`development-card risk-${item.risk}`} {...listeners} {...attributes} onDoubleClick={onOpen}>
    {item.cover_url && <img src={item.cover_url} alt="" className="card-cover"/>}
    <div className="card-body">
      <div className="card-title">{item.code}</div>
      <div className="card-subtitle">{item.title}</div>
      <div className="chips">
        <span className="chip client">{item.client_name}</span>
        {item.status.includes('waiting') && <span className="chip waiting">Em espera</span>}
        {item.labels.map(label => <span key={label.id} className={`chip tone-${label.tone}`}>{label.name}</span>)}
      </div>
      {item.waiting_reason && <div className="waiting-reason">{item.waiting_reason}</div>}
      <div className="next-action"><Sparkles size={14}/>{item.next_action}</div>
      <div className="card-footer">
        <span><Clock3 size={14}/>{item.days_in_stage} d</span>
        {item.comments_count > 0 && <span><MessageCircle size={14}/>{item.comments_count}</span>}
        <b>{item.owner_name.split(' ').map(v => v[0]).slice(0, 2).join('')}</b>
      </div>
    </div>
  </article>
}
