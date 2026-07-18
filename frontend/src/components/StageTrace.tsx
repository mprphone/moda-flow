import { useState } from 'react'
import { Clock3 } from 'lucide-react'
import type { StageHistoryItem } from '../types'

function StageRow({ label, event, onSave }: { label: string; event?: StageHistoryItem; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState(event?.note || '')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const done = !!event?.ended_at
  const active = event?.status === 'active' && !event?.ended_at
  const state = done ? 'Concluída' : active ? 'Em curso' : 'Não iniciada'
  const cls = done ? 'done' : active ? 'active' : 'pending'
  async function save() {
    setBusy(true)
    try { await onSave(note.trim()); setEditing(false) } finally { setBusy(false) }
  }
  return <div className={`stage-trace-row ${cls}`}>
    <span className="stage-dot"/>
    <div className="stage-trace-body">
      <div className="stage-trace-head">
        <strong>{label}</strong>
        <span className={`chip ${done ? 'tone-mint' : active ? 'tone-sky' : 'tone-lilac'}`}>{state}</span>
        {(done || active) && <span className="stage-time">{event!.days} dias{active ? ' · a decorrer' : ''}</span>}
      </div>
      {(event?.responsible_name || event?.supplier_name) && <div className="stage-trace-meta">
        {event?.responsible_name}{event?.responsible_name && event?.supplier_name ? ' · ' : ''}{event?.supplier_name}
      </div>}
      {editing
        ? <div className="stage-note-edit">
            <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} placeholder="O que foi feito, problemas, decisões técnicas..."/>
            <div className="notes-actions"><button disabled={busy} onClick={() => void save()}>Guardar</button></div>
          </div>
        : <div className="stage-note-view" onClick={() => setEditing(true)}>
            {event?.note ? event.note : <span className="stage-note-empty">+ Registar o que foi feito / problemas</span>}
          </div>}
    </div>
  </div>
}

export function StageTrace({ stages, history, onSaveNote, summary }: {
  stages: [string, string][]
  history: StageHistoryItem[]
  onSaveNote: (stage: string, note: string) => Promise<void>
  summary?: React.ReactNode
}) {
  // Para cada fase, o evento mais recente (o real prevalece sobre notas antecipadas).
  const byStage = new Map<string, StageHistoryItem>()
  for (const event of history) {
    const prev = byStage.get(event.stage)
    if (!prev || new Date(event.started_at) >= new Date(prev.started_at)) byStage.set(event.stage, event)
  }
  return <>
    <div className="section-title"><Clock3 size={18}/><strong>Rastreabilidade por etapas</strong></div>
    {summary && <div className="stage-trace-summary">{summary}</div>}
    <div className="stage-trace">{stages.map(([id, label]) =>
      <StageRow key={id} label={label} event={byStage.get(id)} onSave={(note) => onSaveNote(id, note)}/>)}</div>
  </>
}
