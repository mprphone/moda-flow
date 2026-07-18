import { useEffect, useState } from 'react'
import { X, Sparkles, Clock3, UserRound, CalendarDays, ArrowRight, Layers3, Factory, Trash2, TrendingUp, MessageCircle, StickyNote, Scroll, Route, ListChecks, UsersRound } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import { StageTrace } from './StageTrace'
import { LabelPicker } from './LabelPicker'
import type { Development, DevelopmentDetail, Label, Supplier, TeamUser } from '../types'
import { PIPELINE, PHASE_ONE, PHASE_ONE_IDS, STAGE_LABELS } from '../constants/pipeline'

const PRODUCTION_STAGE_NAMES: Record<string, string> = {
  encomenda_recebida: 'Encomenda recebida', materiais: 'Materiais', corte: 'Corte',
  confecao: 'Confeção', controlo_qualidade: 'Controlo qualidade', expedida: 'Expedida', cancelada: 'Cancelada',
}
const PRODUCTION_STAGES: [string, string][] = [
  ['encomenda_recebida', 'Encomenda recebida'], ['materiais', 'Materiais'], ['corte', 'Corte'],
  ['confecao', 'Confeção'], ['controlo_qualidade', 'Controlo qualidade'], ['expedida', 'Expedida'],
]

const STATUS_BADGE: Record<string, { label: string; tone: string }> = {
  active: { label: 'Em curso', tone: 'sky' },
  waiting_supplier: { label: 'Aguarda fornecedor', tone: 'yellow' },
  waiting_client: { label: 'Aguarda cliente', tone: 'yellow' },
  blocked: { label: 'Bloqueado', tone: 'pink' },
  completed: { label: 'Aprovado', tone: 'mint' },
  rejected: { label: 'Reprovado', tone: 'pink' },
  cancelled: { label: 'Cancelado', tone: 'lilac' },
}

const TASK_NAMES: Record<string, string> = {
  ficha: 'Ficha técnica', malha: 'Malha', tingimento: 'Tingimento', grafico_bordado: 'Gráfico/bordado',
  acessorios: 'Acessórios', peca_shopping: 'Peça shopping', envio_cliente: 'Envio ao cliente', resposta_cliente: 'Resposta do cliente',
}
const TASK_STATUS_NAMES: Record<string, string> = { pending: 'Pendente', in_progress: 'Em curso', waiting: 'A aguardar', done: 'Concluída', cancelled: 'Cancelada' }
const ROLE_NAMES: Record<string, string> = { principal: 'Principal', parceria: 'Parceria', fitting: 'Fitting', qualidade: 'Qualidade', grafico: 'Gráfico' }

type Props = {
  item: Development
  labels: Label[]
  onClose: () => void
  onMove: (stage: string) => void
  onStatus: (status: string, reason?: string) => void
  onReject: (reason?: string) => void
  onLabels: (labelIds: number[]) => void
  onOwner: (name: string) => void
  onStructuredChange: (item: Development) => void
  onDescription: (text: string) => Promise<void>
  onComment: (body: string) => Promise<void>
  onCreateProduction: (quantity: number) => void
  onDelete: () => void
}

export function DevelopmentModal({ item, labels, onClose, onMove, onStatus, onReject, onLabels, onOwner, onStructuredChange, onDescription, onComment, onCreateProduction, onDelete }: Props) {
  const [detail, setDetail] = useState<DevelopmentDetail | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [notes, setNotes] = useState(item.description || '')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [designers, setDesigners] = useState<string[]>([])
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([])
  const [assigneeForm, setAssigneeForm] = useState({ user_id: '', role: 'parceria' })
  const [taskForm, setTaskForm] = useState({ kind: 'ficha', note: '', responsible_user_id: '' })
  const [editingOwner, setEditingOwner] = useState(false)
  const [ownerText, setOwnerText] = useState(item.owner_name)
  const [fabricForm, setFabricForm] = useState({ reference: '', supplier_id: '', quantity_meters: '', color: '' })
  const [addingFabric, setAddingFabric] = useState(false)

  useEffect(() => {
    api.get<DevelopmentDetail>(`/developments/${item.id}`).then(setDetail).catch(() => setDetail(null))
  }, [item.id, item.updated_at, refresh])
  useEffect(() => { setNotes(item.description || ''); setOwnerText(item.owner_name) }, [item.id, item.description, item.owner_name])
  useEffect(() => {
    api.get<Supplier[]>('/suppliers').then(setSuppliers).catch(() => {})
    api.get<TeamUser[]>('/users').then(u => { setTeamUsers(u); setDesigners(u.map(x => x.name)) }).catch(() => {})
  }, [])

  function addDesigner(name: string) {
    const parts = ownerText.split(/[+,]/).map(s => s.trim()).filter(Boolean)
    if (parts.includes(name)) return
    setOwnerText([...parts, name].join(' + '))
  }
  function saveOwner() {
    const value = ownerText.trim()
    if (value && value !== item.owner_name) onOwner(value)
    setEditingOwner(false)
  }

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

  function waitFor(status: string, label: string) {
    const reason = window.prompt(`Motivo / informação de ${label}:`, item.waiting_reason || '') || undefined
    onStatus(status, reason)
  }
  function createProduction() {
    const value = Number(window.prompt('Quantidade da produção:', String(item.production_quantity || 1000)))
    if (Number.isFinite(value) && value > 0) onCreateProduction(value)
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

  async function saveStageNote(stage: string, note: string) {
    const updated = await api.put<DevelopmentDetail>(`/developments/${item.id}/stage-notes`, { stage, note: note || null })
    setDetail(updated)
    toast('success', 'Nota da fase guardada.')
  }

  async function refreshStructured(updated: Development) {
    onStructuredChange(updated)
    const fresh = await api.get<DevelopmentDetail>(`/developments/${item.id}`)
    setDetail(fresh)
  }

  async function addAssignee() {
    if (!assigneeForm.user_id) return
    const updated = await api.post<Development>(`/developments/${item.id}/assignees`, { user_id: Number(assigneeForm.user_id), role: assigneeForm.role })
    setAssigneeForm({ user_id: '', role: 'parceria' })
    await refreshStructured(updated)
  }

  async function removeAssignee(id: number) {
    await api.del(`/developments/${item.id}/assignees/${id}`)
    await refreshStructured(await api.get<Development>(`/developments/${item.id}`))
  }

  async function addTask() {
    const updated = await api.post<Development>(`/developments/${item.id}/tasks`, {
      kind: taskForm.kind, note: taskForm.note || null,
      responsible_user_id: taskForm.responsible_user_id ? Number(taskForm.responsible_user_id) : null,
    })
    setTaskForm({ kind: 'ficha', note: '', responsible_user_id: '' })
    await refreshStructured(updated)
  }

  async function updateTask(id: number, payload: Record<string, unknown>) {
    await refreshStructured(await api.patch<Development>(`/developments/${item.id}/tasks/${id}`, payload))
  }

  async function removeTask(id: number) {
    await api.del(`/developments/${item.id}/tasks/${id}`)
    await refreshStructured(await api.get<Development>(`/developments/${item.id}`))
  }

  const completedStages = detail ? detail.stage_history.filter(e => e.ended_at).length : 0
  const totalDays = detail ? Math.round(detail.stage_history.reduce((sum, e) => sum + (e.days || 0), 0)) : 0
  // Na fase de proposta só se mostram as fases dessa etapa; malhas/produção ainda não se aplicam.
  const inProposal = (PHASE_ONE_IDS as readonly string[]).includes(item.current_stage)
  const traceStages = (inProposal ? PHASE_ONE : PIPELINE) as unknown as [string, string][]
  const showFabrics = !inProposal || (detail?.fabric_requests.length ?? 0) > 0
  const showProductions = (detail?.productions.length ?? 0) > 0

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card" onMouseDown={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X/></button>
    <div className="modal-cover" style={{backgroundImage: `url(${item.cover_url || ''})`}}></div>
    <div className="modal-main">
      <div className="modal-content">
        <div className="eyebrow">{item.client_name} · {STAGE_LABELS[item.current_stage]}</div>
        <div className="modal-title-row">
          <h2>{item.title === item.code ? item.title : `${item.code} — ${item.title}`}</h2>
          {STATUS_BADGE[item.status] && <span className={`status-badge tone-${STATUS_BADGE[item.status].tone}`}>{STATUS_BADGE[item.status].label}</span>}
        </div>
        <div className="quick-meta">
          {editingOwner
            ? <span className="owner-edit">
                <UserRound size={16}/>
                <input autoFocus value={ownerText} onChange={e => setOwnerText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveOwner()} placeholder="Designer(s) responsável(is)"/>
                <button onClick={saveOwner}>✓</button>
              </span>
            : <span className="owner-view" onClick={() => setEditingOwner(true)}><UserRound size={16}/>{item.owner_name || 'Definir responsável'} <span className="owner-edit-hint">✎</span></span>}
          <span><Clock3 size={16}/>{item.days_in_stage} dias nesta fase</span>
          <span><CalendarDays size={16}/>{item.due_date || 'Sem prazo'}</span>
          {detail?.estimated_completion && <span className={detail.eta_at_risk ? 'eta-risk' : ''}><TrendingUp size={16}/>Previsão: {detail.estimated_completion}{detail.eta_at_risk ? ' ⚠ depois do prazo' : ''}</span>}
        </div>
        {editingOwner && designers.length > 0 && <div className="designer-suggestions">
          Designers: {designers.map(name => <button key={name} type="button" className="designer-chip" onClick={() => addDesigner(name)}>+ {name}</button>)}
          <span className="designer-hint">(clique para juntar em parceria)</span>
        </div>}
        <LabelPicker all={labels} applied={item.labels} onChange={onLabels}/>
        <section className="history-section parallel-work">
          <div className="section-title"><UsersRound size={18}/><strong>Equipa e funções</strong></div>
          <div className="structured-chips">
            {(detail?.assignees || item.assignees).map(person => <span className="structured-chip" key={person.id}>
              <strong>{person.name}</strong> · {ROLE_NAMES[person.role] || person.role}
              <button type="button" onClick={() => void removeAssignee(person.id)}>×</button>
            </span>)}
            {(detail?.assignees || item.assignees).length === 0 && <span className="empty-note">Sem equipa estruturada; mantém-se {item.owner_name} como responsável principal.</span>}
          </div>
          <div className="structured-add">
            <select value={assigneeForm.user_id} onChange={e => setAssigneeForm({ ...assigneeForm, user_id: e.target.value })}>
              <option value="">Adicionar pessoa...</option>{teamUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <select value={assigneeForm.role} onChange={e => setAssigneeForm({ ...assigneeForm, role: e.target.value })}>
              {Object.entries(ROLE_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <button type="button" disabled={!assigneeForm.user_id} onClick={() => void addAssignee()}>Adicionar</button>
          </div>
        </section>
        <section className="history-section parallel-work">
          <div className="section-title"><ListChecks size={18}/><strong>Pendências paralelas</strong></div>
          <p className="section-help">Estas tarefas podem avançar em simultâneo, sem obrigar o modelo a mudar de fase.</p>
          <div className="parallel-task-list">
            {(detail?.tasks || item.tasks).map(task => <div className={`parallel-task ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}>
              <div><strong>{TASK_NAMES[task.kind] || task.kind}</strong><span>{task.note || 'Sem nota'}{task.responsible_name ? ` · ${task.responsible_name}` : ''}</span></div>
              <select value={task.status} onChange={e => void updateTask(task.id, { status: e.target.value })}>
                {Object.entries(TASK_STATUS_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <button className="icon-danger" type="button" onClick={() => void removeTask(task.id)}><Trash2 size={14}/></button>
            </div>)}
            {(detail?.tasks || item.tasks).length === 0 && <p className="empty-note">Sem pendências paralelas.</p>}
          </div>
          <div className="structured-add task-add">
            <select value={taskForm.kind} onChange={e => setTaskForm({ ...taskForm, kind: e.target.value })}>
              {Object.entries(TASK_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <input value={taskForm.note} onChange={e => setTaskForm({ ...taskForm, note: e.target.value })} placeholder="Nota ou bloqueio..."/>
            <select value={taskForm.responsible_user_id} onChange={e => setTaskForm({ ...taskForm, responsible_user_id: e.target.value })}>
              <option value="">Sem responsável</option>{teamUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <button type="button" onClick={() => void addTask()}>Adicionar</button>
          </div>
        </section>
        <div className="compact-pipeline">{traceStages.map(([id,label]) => {
          const i = PIPELINE.findIndex(([pid]) => pid === id)
          return <button key={id} className={i < index ? 'done' : i === index ? 'active' : ''} onClick={() => onMove(id)}><span>{i+1}</span>{label}</button>
        })}</div>
        <section className="smart-panel"><div><Sparkles size={20}/><strong>Assistente do desenvolvimento</strong></div>{item.suggestions.length ? item.suggestions.map(text => <p key={text}>{text}</p>) : <p>O desenvolvimento está dentro do ritmo normal.</p>}</section>
        <section className="current-stage"><div className="section-title"><Layers3 size={18}/><strong>Fase atual</strong></div><div className="stage-focus"><div><small>ONDE ESTÁ</small><strong>{STAGE_LABELS[item.current_stage]}</strong></div><div><small>PRÓXIMA AÇÃO</small><strong>{item.next_action}</strong></div><div><small>MOTIVO DE ESPERA</small><strong>{item.waiting_reason || 'Sem bloqueios registados'}</strong></div></div></section>
        {item.current_stage === 'proposta_cliente'
          ? <div className="advance-row">
              <button className="advance-btn ok" onClick={() => onMove('ficha_tecnica')}>✔ Cliente aprovou — iniciar desenvolvimento de amostras</button>
              <button className="advance-btn no" onClick={() => onReject(window.prompt('Motivo da reprovação (opcional):') || undefined)}>✖ Cliente reprovou</button>
            </div>
          : item.current_stage === 'aprovado'
            ? <button className="advance-btn" onClick={createProduction}>Criar produção industrial <Factory size={17}/></button>
            : <button className="advance-btn" onClick={() => onMove(next[0])}>Concluir “{STAGE_LABELS[item.current_stage]}” e avançar para “{next[1]}” <ArrowRight size={17}/></button>}
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

        <section className="history-section journey">
          <div className="journey-title"><Route size={19}/><strong>Percurso do modelo — do desenho à produção</strong></div>

          <div className="journey-block">
            <div className="journey-head"><span className="journey-badge dev"><Layers3 size={14}/></span>{inProposal ? '1 · Proposta ao cliente' : '1 · Desenvolvimento da amostra'}</div>
            {detail && <StageTrace
              heading=""
              stages={traceStages}
              history={detail.stage_history}
              onSaveNote={saveStageNote}
              summary={<>
                <span>{completedStages} etapas concluídas</span>
                <span>{totalDays} dias no total</span>
                {!inProposal && detail.estimated_completion && <span className={detail.eta_at_risk ? 'eta-risk' : ''}>Previsão: {detail.estimated_completion}</span>}
              </>}
            />}
          </div>

          {showFabrics && <div className="journey-block">
            <div className="journey-head"><span className="journey-badge fabric"><Scroll size={14}/></span>2 · Malhas
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
            {detail && detail.fabric_requests.length === 0 && !addingFabric && <p className="empty-note">Ainda sem malhas pedidas.</p>}
          </div>}

          {showProductions && <div className="journey-block">
            <div className="journey-head"><span className="journey-badge prod"><Factory size={14}/></span>3 · Produção industrial</div>
            {detail && detail.productions.map(p => <div key={p.id} className="journey-production">
              <div className="journey-prod-head">
                <strong>{p.title || `Produção #${p.id}`}</strong>
                <span className="chip tone-sky">{PRODUCTION_STAGE_NAMES[p.status] || p.status}</span>
                {p.quantity > 0 && <span className="journey-prod-qty">{p.quantity} un.</span>}
              </div>
              {p.stage_history.length > 0 && <StageTrace heading="" readOnly stages={PRODUCTION_STAGES} history={p.stage_history}/>}
            </div>)}
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
      </div>
      <aside className="modal-side">
        <h3>Ações rápidas</h3>
        <button className="action" onClick={() => waitFor('waiting_supplier', 'espera do fornecedor')}>Aguardar fornecedor</button>
        <button className="action" onClick={() => waitFor('waiting_client', 'espera do cliente')}>Aguardar cliente</button>
        <button className="action" onClick={() => onStatus('blocked', window.prompt('Qual é o bloqueio?') || undefined)}>Registar bloqueio</button>
        {(item.status === 'waiting_supplier' || item.status === 'waiting_client' || item.status === 'blocked') &&
          <button className="action" onClick={() => onStatus('active')}>Retomar (limpar espera)</button>}
        <button className="action danger" onClick={confirmDelete}><Trash2 size={15}/> Eliminar desenvolvimento</button>
        <div className="mini-note">O botão grande avança de fase. Estas ações registam esperas e bloqueios.</div>
      </aside>
    </div>
  </div></div>
}
