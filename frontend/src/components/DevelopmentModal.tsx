import { useEffect, useState } from 'react'
import { X, Sparkles, Clock3, UserRound, CalendarDays, ArrowRight, Layers3, Factory, Tag, Trash2, TrendingUp, MessageCircle, StickyNote, Scroll } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Development, DevelopmentDetail, Label, Supplier } from '../types'
import { PIPELINE, STAGE_LABELS } from '../constants/pipeline'

type Props = {
  item: Development
  labels: Label[]
  onClose: () => void
  onMove: (stage: string) => void
  onStatus: (status: string, reason?: string) => void
  onReject: (reason?: string) => void
  onLabels: (labelIds: number[]) => void
  onDescription: (text: string) => Promise<void>
  onComment: (body: string) => Promise<void>
  onCreateProduction: (quantity: number) => void
  onDelete: () => void
}

export function DevelopmentModal({ item, labels, onClose, onMove, onStatus, onReject, onLabels, onDescription, onComment, onCreateProduction, onDelete }: Props) {
  const [detail, setDetail] = useState<DevelopmentDetail | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [notes, setNotes] = useState(item.description || '')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [fabricForm, setFabricForm] = useState({ reference: '', supplier_id: '', quantity_meters: '', color: '' })
  const [addingFabric, setAddingFabric] = useState(false)

  useEffect(() => {
    api.get<DevelopmentDetail>(`/developments/${item.id}`).then(setDetail).catch(() => setDetail(null))
  }, [item.id, item.updated_at, refresh])
  useEffect(() => { setNotes(item.description || '') }, [item.id, item.description])
  useEffect(() => { api.get<Supplier[]>('/suppliers').then(setSuppliers).catch(() => {}) }, [])

  async function submitFabric() {
    if (!fabricForm.reference.trim()) return
    setSaving(true)
    try {
      await api.post('/fabric-requests', {
        reference: fabricForm.reference.trim(),
        supplier_id: fabricForm.supplier_id ? Number(fabricForm.supplier_id) : null,
        quantity_meters: fabricForm.quantity_meters ? Number(fabricForm.quantity_meters) : null,
        color: fabricForm.color || null,
        development_id: item.id,
      })
      setFabricForm({ reference: '', supplier_id: '', quantity_meters: '', color: '' })
      setAddingFabric(false)
      setRefresh(v => v + 1)
      toast('success', 'Pedido de malha registado e associado a este modelo.')
    } finally { setSaving(false) }
  }

  const index = PIPELINE.findIndex(([id]) => id === item.current_stage)
  const next = PIPELINE[Math.min(index + 1, PIPELINE.length - 1)]
  const activeLabelIds = new Set(item.labels.map(label => label.id))

  function waitFor(status: string, label: string) {
    const reason = window.prompt(`Motivo / informação de ${label}:`, item.waiting_reason || '') || undefined
    onStatus(status, reason)
  }
  function createProduction() {
    const value = Number(window.prompt('Quantidade da produção:', String(item.production_quantity || 1000)))
    if (Number.isFinite(value) && value > 0) onCreateProduction(value)
  }
  function toggleLabel(id: number) {
    const nextIds = activeLabelIds.has(id)
      ? item.labels.filter(label => label.id !== id).map(label => label.id)
      : [...item.labels.map(label => label.id), id]
    onLabels(nextIds)
  }
  function confirmDelete() {
    if (window.confirm(`Eliminar definitivamente ${item.code}? Esta ação não pode ser desfeita.`)) onDelete()
  }
  async function saveNotes() {
    setSaving(true)
    try { await onDescription(notes.trim()) } finally { setSaving(false) }
  }
  async function submitComment() {
    const body = comment.trim()
    if (!body) return
    setSaving(true)
    try {
      await onComment(body)
      setComment('')
      setRefresh(v => v + 1)
    } finally { setSaving(false) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card" onMouseDown={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X/></button>
    <div className="modal-cover" style={{backgroundImage: `url(${item.cover_url || ''})`}}></div>
    <div className="modal-main">
      <div className="modal-content">
        <div className="eyebrow">{item.client_name} · {STAGE_LABELS[item.current_stage]}</div>
        <h2>{item.title === item.code ? item.title : `${item.code} — ${item.title}`}</h2>
        <div className="quick-meta">
          <span><UserRound size={16}/>{item.owner_name}</span>
          <span><Clock3 size={16}/>{item.days_in_stage} dias nesta fase</span>
          <span><CalendarDays size={16}/>{item.due_date || 'Sem prazo'}</span>
          {detail?.estimated_completion && <span className={detail.eta_at_risk ? 'eta-risk' : ''}><TrendingUp size={16}/>Previsão: {detail.estimated_completion}{detail.eta_at_risk ? ' ⚠ depois do prazo' : ''}</span>}
        </div>
        <div className="label-row">
          <Tag size={14}/>
          {labels.map(label => <button
            key={label.id}
            className={`chip tone-${label.tone} label-toggle ${activeLabelIds.has(label.id) ? 'on' : ''}`}
            onClick={() => toggleLabel(label.id)}
          >{label.name}</button>)}
        </div>
        <div className="compact-pipeline">{PIPELINE.map(([id,label], i) => <button key={id} className={i < index ? 'done' : i === index ? 'active' : ''} onClick={() => onMove(id)}><span>{i+1}</span>{label}</button>)}</div>
        <section className="smart-panel"><div><Sparkles size={20}/><strong>Assistente do desenvolvimento</strong></div>{item.suggestions.length ? item.suggestions.map(text => <p key={text}>{text}</p>) : <p>O desenvolvimento está dentro do ritmo normal.</p>}</section>
        <section className="current-stage"><div className="section-title"><Layers3 size={18}/><strong>Fase atual</strong></div><div className="stage-focus"><div><small>ONDE ESTÁ</small><strong>{STAGE_LABELS[item.current_stage]}</strong></div><div><small>PRÓXIMA AÇÃO</small><strong>{item.next_action}</strong></div><div><small>MOTIVO DE ESPERA</small><strong>{item.waiting_reason || 'Sem bloqueios registados'}</strong></div></div></section>
        <section className="history-section">
          <div className="section-title fabric-title">
            <Scroll size={18}/><strong>Malhas deste modelo</strong>
            <button className="team-action" onClick={() => setAddingFabric(v => !v)}>{addingFabric ? 'Cancelar' : '+ Pedir malha'}</button>
          </div>
          {addingFabric && <div className="fabric-quick-add">
            <input placeholder="Referência *" value={fabricForm.reference} onChange={e => setFabricForm({ ...fabricForm, reference: e.target.value })}/>
            <select value={fabricForm.supplier_id} onChange={e => setFabricForm({ ...fabricForm, supplier_id: e.target.value })}>
              <option value="">Fornecedor...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input placeholder="Metros" type="number" step="0.5" min="0" value={fabricForm.quantity_meters} onChange={e => setFabricForm({ ...fabricForm, quantity_meters: e.target.value })}/>
            <input placeholder="Cor" value={fabricForm.color} onChange={e => setFabricForm({ ...fabricForm, color: e.target.value })}/>
            <button disabled={saving || !fabricForm.reference.trim()} onClick={() => void submitFabric()}>Pedir</button>
          </div>}
          {detail && detail.fabric_requests.length > 0 && <div className="history-list">{detail.fabric_requests.map(f => <div className="history-row" key={f.id}>
            <strong>{f.reference}{f.color ? ` · ${f.color}` : ''}{f.supplier_name ? ` — ${f.supplier_name}` : ''}</strong>
            <span>
              {{pedido: 'Pedido', envio_em_curso: 'Envio em curso', recebida: 'Recebida', tingimento: 'Tingimento', cancelada: 'Cancelada'}[f.status] || f.status}
              {f.days_pending != null ? ` · há ${f.days_pending} d` : ''}
              {f.needs_reminder ? ' · ⚠ relançar fornecedor' : ''}
            </span>
          </div>)}</div>}
          {detail && detail.fabric_requests.length === 0 && !addingFabric && <p className="empty-note">Ainda sem malhas pedidas para este modelo.</p>}
        </section>
        <section className="history-section notes-section">
          <div className="section-title"><StickyNote size={18}/><strong>Notas</strong></div>
          <textarea
            placeholder="Adicione uma descrição mais detalhada — medidas, materiais, decisões do cliente..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          {notes.trim() !== (item.description || '').trim() && <div className="notes-actions">
            <button disabled={saving} onClick={() => void saveNotes()}>Guardar notas</button>
          </div>}
        </section>
        <section className="history-section">
          <div className="section-title"><MessageCircle size={18}/><strong>Comentários</strong></div>
          <div className="comment-box">
            <textarea placeholder="Escrever um comentário..." value={comment} onChange={e => setComment(e.target.value)}/>
            <button disabled={saving || !comment.trim()} onClick={() => void submitComment()}>Comentar</button>
          </div>
          <div className="history-list">{(detail?.comments || []).map(c => <div className="comment-row" key={c.id}>
            <strong>{c.author}</strong>
            <span>{c.body}</span>
            <small>{new Date(c.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
          </div>)}</div>
        </section>
        {detail && detail.stage_history.length > 0 && <section className="history-section">
          <div className="section-title"><Clock3 size={18}/><strong>Histórico de fases</strong></div>
          <div className="history-list">{[...detail.stage_history].reverse().map((event, i) => <div className="history-row" key={i}>
            <strong>{STAGE_LABELS[event.stage] || event.stage}</strong>
            <span>{event.days} d{event.supplier_name ? ` · ${event.supplier_name}` : ''}{event.ended_at ? '' : ' · em curso'}</span>
            {event.note && <em>{event.note}</em>}
          </div>)}</div>
        </section>}
      </div>
      <aside className="modal-side">
        <h3>Ações rápidas</h3>
        {item.current_stage === 'novo' && <button className="action primary" onClick={() => onMove('proposta_cliente')}>Enviar proposta ao cliente <ArrowRight size={16}/></button>}
        {item.current_stage === 'proposta_cliente' && <>
          <button className="action primary" onClick={() => onMove('ficha_tecnica')}>✔ Cliente aprovou — iniciar amostra</button>
          <button className="action danger" onClick={() => onReject(window.prompt('Motivo da reprovação (opcional):') || undefined)}>✖ Cliente reprovou</button>
        </>}
        {item.current_stage === 'aprovado' && <button className="action primary" onClick={createProduction}>Criar produção <Factory size={16}/></button>}
        {item.current_stage !== 'novo' && item.current_stage !== 'proposta_cliente' && item.current_stage !== 'aprovado' && <button className="action primary" onClick={() => onMove(next[0])}>Concluir e avançar <ArrowRight size={16}/></button>}
        <button className="action" onClick={() => waitFor('waiting_supplier', 'espera do fornecedor')}>Aguardar fornecedor</button>
        <button className="action" onClick={() => waitFor('waiting_client', 'espera do cliente')}>Aguardar cliente</button>
        <button className="action" onClick={() => onStatus('blocked', window.prompt('Qual é o bloqueio?') || undefined)}>Registar bloqueio</button>
        <button className="action danger" onClick={confirmDelete}><Trash2 size={15}/> Eliminar desenvolvimento</button>
        <div className="mini-note">Cada ação atualiza automaticamente datas, tempos e histórico.</div>
      </aside>
    </div>
  </div></div>
}
