import { useEffect, useRef, useState } from 'react'
import { Tag, X } from 'lucide-react'
import type { Label } from '../types'

export function LabelPicker({ all, applied, onChange }: {
  all: Label[]
  applied: Label[]
  onChange: (labelIds: number[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const appliedIds = new Set(applied.map(l => l.id))

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function toggle(id: number) {
    onChange(appliedIds.has(id) ? applied.filter(l => l.id !== id).map(l => l.id) : [...applied.map(l => l.id), id])
  }

  return <div className="label-picker" ref={ref}>
    <div className="label-chips">
      {applied.map(l => <span key={l.id} className={`chip tone-${l.tone} applied-label`}>
        {l.name}<button type="button" title="Remover" onClick={() => toggle(l.id)}><X size={11}/></button>
      </span>)}
      <button type="button" className="label-add" onClick={() => setOpen(o => !o)}><Tag size={13}/> Etiqueta</button>
    </div>
    {open && <div className="label-menu">
      <div className="label-menu-title">Etiquetas</div>
      {all.map(l => <button key={l.id} type="button" className={`label-menu-item ${appliedIds.has(l.id) ? 'on' : ''}`} onClick={() => toggle(l.id)}>
        <span className={`chip tone-${l.tone}`}>{l.name}</span>
        {appliedIds.has(l.id) && <span className="label-check">✓</span>}
      </button>)}
      {all.length === 0 && <div className="empty-note">Sem etiquetas disponíveis.</div>}
    </div>}
  </div>
}
