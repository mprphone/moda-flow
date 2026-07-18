import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Filter, Columns3, Archive, RotateCcw, Building2 } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { toast } from '../lib/toast'
import type { Development, Label } from '../types'
import { PHASE_ONE, PHASE_ONE_IDS, PHASE_TWO } from '../constants/pipeline'
import { BoardColumn } from '../components/BoardColumn'
import { DevelopmentModal } from '../components/DevelopmentModal'

type Board = 'portfolio' | 'samples'
type View = 'board' | 'client' | 'rejected'

const BOARD_META: Record<Board, { title: string; subtitle: string; boardTab: string }> = {
  portfolio: {
    title: 'Portefólio & Modelos',
    subtitle: 'Desenho e proposta ao cliente. Quando o cliente aprova, o cartão passa sozinho para o desenvolvimento de amostras.',
    boardTab: 'Propostas',
  },
  samples: {
    title: 'Desenvolvimento de amostras',
    subtitle: 'A amostra física: ficha técnica, malha, tingimento, modelagem, corte, confeção e envio ao cliente.',
    boardTab: 'Amostras',
  },
}

export function BoardPage({ board, refreshKey }: { board: Board; refreshKey: number }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Development[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [selected, setSelected] = useState<Development | null>(null)
  const [view, setView] = useState<View>('board')
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [labelFilter, setLabelFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [taskFilter, setTaskFilter] = useState('')
  const [archiveLimit, setArchiveLimit] = useState(50)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const load = () => api.get<Development[]>('/developments').then(setItems)
  useEffect(() => { void load(); api.get<Label[]>('/labels').then(setLabels) }, [refreshKey])

  const clients = useMemo(() => [...new Set(items.map(item => item.client_name))].sort(), [items])
  const assignees = useMemo(() => [...new Set(items.flatMap(item => item.assignees.map(person => person.name)))].sort(), [items])
  const isPhaseOne = (stage: string) => (PHASE_ONE_IDS as readonly string[]).includes(stage)

  const filtered = useMemo(() => items.filter(item => {
    const text = `${item.code} ${item.title} ${item.owner_name} ${item.client_name}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (clientFilter && item.client_name !== clientFilter) return false
    if (riskFilter && item.risk !== riskFilter) return false
    if (labelFilter && !item.labels.some(label => String(label.id) === labelFilter)) return false
    if (assigneeFilter && !item.assignees.some(person => person.name === assigneeFilter)) return false
    if (taskFilter && !item.tasks.some(task => task.kind === taskFilter && !['done', 'cancelled'].includes(task.status))) return false
    return true
  }), [items, query, clientFilter, riskFilter, labelFilter, assigneeFilter, taskFilter])

  // Arquivo: reprovados, cancelados e amostras enviadas (concluídas fora da coluna Aprovado)
  const isArchived = (item: Development) =>
    item.status === 'rejected' || item.status === 'cancelled' || (item.status === 'completed' && item.current_stage !== 'aprovado')
  const rejected = useMemo(() => filtered.filter(isArchived), [filtered])
  // Cada quadro só mostra os seus modelos ativos: portfolio = fase 1, amostras = fase 2
  const active = useMemo(() => filtered.filter(item =>
    !isArchived(item) && (board === 'portfolio' ? isPhaseOne(item.current_stage) : !isPhaseOne(item.current_stage))),
    [filtered, board])

  const byClient = view === 'client'
  const activeClients = useMemo(() => [...new Set(active.map(item => item.client_name))].sort(), [active])
  const columns = byClient
    ? activeClients.map(name => [name, name] as [string, string])
    : (board === 'portfolio' ? PHASE_ONE : PHASE_TWO)
  const grouped = useMemo(
    () => Object.fromEntries(columns.map(([id]) => [id, active.filter(item => byClient ? item.client_name === id : item.current_stage === id)])),
    [columns, active, byClient],
  )

  async function move(id: number, stage: string) {
    const previous = items
    setItems(current => current.map(item => item.id === id ? { ...item, current_stage: stage } : item))
    try {
      const updated = await api.post<Development>(`/developments/${id}/move`, { to_stage: stage })
      setItems(current => current.map(item => item.id === id ? updated : item))
      setSelected(current => current?.id === id ? updated : current)
      if (board === 'portfolio' && stage === 'ficha_tecnica') {
        toast('success', 'Proposta aprovada — passou para o Desenvolvimento de amostras.')
      }
    } catch {
      setItems(previous)
    }
  }

  async function updateItem(id: number, payload: Record<string, unknown>) {
    const updated = await api.patch<Development>(`/developments/${id}`, payload)
    setItems(current => current.map(item => item.id === id ? updated : item))
    setSelected(current => current?.id === id ? updated : current)
    return updated
  }

  async function rejectItem(id: number, reason?: string) {
    await updateItem(id, { status: 'rejected', waiting_reason: reason || null })
    setSelected(null)
    toast('success', 'Proposta arquivada como reprovada.')
  }

  async function reactivate(id: number) {
    await updateItem(id, { status: 'active', waiting_reason: null })
    toast('success', 'Desenvolvimento reativado.')
  }

  async function addComment(id: number, body: string) {
    await api.post(`/developments/${id}/comments`, { body, author: user?.name || 'Utilizador' })
    toast('success', 'Comentário registado.')
  }

  async function saveDescription(id: number, text: string) {
    await updateItem(id, { description: text || null })
    toast('success', 'Notas guardadas.')
  }

  async function createProduction(id: number, quantity: number) {
    await api.post('/productions', { development_id: id, quantity })
    toast('success', 'Produção industrial criada.')
  }

  async function removeDevelopment(id: number) {
    await api.del(`/developments/${id}`)
    setItems(current => current.filter(item => item.id !== id))
    setSelected(null)
    toast('success', 'Desenvolvimento eliminado.')
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || byClient) return
    const item = event.active.data.current as Development
    const stage = String(event.over.id)
    if (item.current_stage !== stage) void move(item.id, stage)
  }

  const meta = BOARD_META[board]

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>{meta.title}</h1>
        <p>{meta.subtitle}</p>
      </div>
      <div className="board-legend">
        <span className="mint">Concluído</span><span className="sky">Em curso</span><span className="yellow">Aguarda</span><span className="pink">Atraso</span>
      </div>
    </div>
    <div className="phase-tabs">
      <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><Columns3 size={15}/>{meta.boardTab} <span>{active.length}</span></button>
      <button className={view === 'client' ? 'active' : ''} onClick={() => setView('client')}><Building2 size={15}/>Por cliente <span>{active.length}</span></button>
      <button className={view === 'rejected' ? 'active' : ''} onClick={() => setView('rejected')}><Archive size={15}/>Arquivo <span>{rejected.length}</span></button>
    </div>
    <div className="filter-bar">
      <Filter size={16}/>
      <input placeholder="Pesquisar código, modelo, responsável..." value={query} onChange={e => setQuery(e.target.value)}/>
      <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
        <option value="">Todos os clientes</option>
        {clients.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
        <option value="">Todos os riscos</option>
        <option value="high">Risco alto</option>
        <option value="medium">Risco médio</option>
        <option value="low">Sem risco</option>
      </select>
      <select value={labelFilter} onChange={e => setLabelFilter(e.target.value)}>
        <option value="">Todas as etiquetas</option>
        {labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}
      </select>
      <select value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
        <option value="">Toda a equipa</option>
        {assignees.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
      <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)}>
        <option value="">Todas as pendências</option>
        <option value="ficha">Ficha técnica</option><option value="malha">Malha</option><option value="tingimento">Tingimento</option>
        <option value="grafico_bordado">Gráfico/bordado</option><option value="acessorios">Acessórios</option>
        <option value="peca_shopping">Peça shopping</option><option value="envio_cliente">Envio ao cliente</option><option value="resposta_cliente">Resposta do cliente</option>
      </select>
      {(query || clientFilter || riskFilter || labelFilter || assigneeFilter || taskFilter) && <button className="clear-filters" onClick={() => { setQuery(''); setClientFilter(''); setRiskFilter(''); setLabelFilter(''); setAssigneeFilter(''); setTaskFilter('') }}>Limpar</button>}
    </div>
    {view !== 'rejected' && <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {columns.map(([id, title]) => <BoardColumn key={id} id={id} title={title} items={grouped[id] || []} onOpen={setSelected} showStage={byClient}/>) }
      </div>
    </DndContext>}
    {view === 'rejected' && <div className="rejected-list">
      {rejected.length === 0 && <p className="empty-note">Arquivo vazio.</p>}
      {rejected.slice(0, archiveLimit).map(item => <article className="fabric-row" key={item.id}>
        {item.cover_url && <img src={item.cover_url} alt=""/>}
        <div className="fabric-main">
          <strong>{item.code}{item.title !== item.code ? ` — ${item.title}` : ''}</strong>
          <span>{item.client_name} · {item.owner_name}</span>
          {item.waiting_reason && <em>{item.waiting_reason}</em>}
        </div>
        <div className="fabric-side">
          <span className={`chip ${item.status === 'completed' ? 'tone-mint' : 'tone-pink'}`}>
            {item.status === 'completed' ? 'Amostra enviada' : item.status === 'cancelled' ? 'Cancelado' : 'Reprovado'}
          </span>
          <button className="team-action" onClick={() => void reactivate(item.id)}><RotateCcw size={14}/> Reativar</button>
        </div>
      </article>)}
      {rejected.length > archiveLimit && <button className="clear-filters" onClick={() => setArchiveLimit(v => v + 200)}>Mostrar mais {rejected.length - archiveLimit}...</button>}
    </div>}
    {selected && <DevelopmentModal
      item={selected}
      labels={labels}
      onClose={() => setSelected(null)}
      onMove={(stage) => void move(selected.id, stage)}
      onStatus={(status, reason) => void updateItem(selected.id, { status, waiting_reason: reason || null })}
      onReject={(reason) => void rejectItem(selected.id, reason)}
      onLabels={(labelIds) => void updateItem(selected.id, { label_ids: labelIds })}
      onOwner={(name) => void updateItem(selected.id, { owner_name: name })}
      onStructuredChange={(updated) => {
        setItems(current => current.map(item => item.id === updated.id ? updated : item))
        setSelected(updated)
      }}
      onDescription={(text) => saveDescription(selected.id, text)}
      onComment={(body) => addComment(selected.id, body)}
      onCreateProduction={(quantity) => void createProduction(selected.id, quantity)}
      onDelete={() => void removeDevelopment(selected.id)}
    />}
  </div>
}
