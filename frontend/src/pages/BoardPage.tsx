import { useEffect, useMemo, useState } from 'react'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { Filter } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { toast } from '../lib/toast'
import type { Development, Label } from '../types'
import { PIPELINE } from '../constants/pipeline'
import { BoardColumn } from '../components/BoardColumn'
import { DevelopmentModal } from '../components/DevelopmentModal'

export function BoardPage({ refreshKey }: { refreshKey: number }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Development[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [selected, setSelected] = useState<Development | null>(null)
  const [query, setQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [labelFilter, setLabelFilter] = useState('')

  const load = () => api.get<Development[]>('/developments').then(setItems)
  useEffect(() => { void load(); api.get<Label[]>('/labels').then(setLabels) }, [refreshKey])

  const clients = useMemo(() => [...new Set(items.map(item => item.client_name))].sort(), [items])

  const visible = useMemo(() => items.filter(item => {
    const text = `${item.code} ${item.title} ${item.owner_name} ${item.client_name}`.toLowerCase()
    if (query && !text.includes(query.toLowerCase())) return false
    if (clientFilter && item.client_name !== clientFilter) return false
    if (riskFilter && item.risk !== riskFilter) return false
    if (labelFilter && !item.labels.some(label => String(label.id) === labelFilter)) return false
    return true
  }), [items, query, clientFilter, riskFilter, labelFilter])

  const grouped = useMemo(
    () => Object.fromEntries(PIPELINE.map(([id]) => [id, visible.filter(item => item.current_stage === id)])),
    [visible],
  )

  async function move(id: number, stage: string) {
    const previous = items
    // atualização otimista: o cartão muda já de coluna e reverte se a API falhar
    setItems(current => current.map(item => item.id === id ? { ...item, current_stage: stage } : item))
    try {
      const updated = await api.post<Development>(`/developments/${id}/move`, { to_stage: stage })
      setItems(current => current.map(item => item.id === id ? updated : item))
      setSelected(current => current?.id === id ? updated : current)
    } catch {
      setItems(previous)
    }
  }

  async function updateItem(id: number, payload: Record<string, unknown>) {
    const updated = await api.patch<Development>(`/developments/${id}`, payload)
    setItems(current => current.map(item => item.id === id ? updated : item))
    setSelected(current => current?.id === id ? updated : current)
  }

  async function addComment(id: number, body: string) {
    await api.post(`/developments/${id}/comments`, { body, author: user?.name || 'Utilizador' })
    toast('success', 'Comentário registado.')
  }

  async function createProduction(id: number, quantity: number) {
    await api.post('/productions', { development_id: id, quantity })
    toast('success', 'Produção criada com sucesso.')
  }

  async function removeDevelopment(id: number) {
    await api.del(`/developments/${id}`)
    setItems(current => current.filter(item => item.id !== id))
    setSelected(null)
    toast('success', 'Desenvolvimento eliminado.')
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return
    const item = event.active.data.current as Development
    const stage = String(event.over.id)
    if (item.current_stage !== stage) void move(item.id, stage)
  }

  return <div className="board-page">
    <div className="page-heading">
      <div>
        <h1>Desenvolvimento de modelos</h1>
        <p>Arraste os cartões. Tempos, histórico e alertas são atualizados automaticamente.</p>
      </div>
      <div className="board-legend">
        <span className="mint">Concluído</span><span className="sky">Em curso</span><span className="yellow">Aguarda</span><span className="pink">Atraso</span>
      </div>
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
      {(query || clientFilter || riskFilter || labelFilter) && <button className="clear-filters" onClick={() => { setQuery(''); setClientFilter(''); setRiskFilter(''); setLabelFilter('') }}>Limpar</button>}
    </div>
    <DndContext onDragEnd={handleDragEnd}>
      <div className="board-scroll">
        {PIPELINE.map(([id, title]) => <BoardColumn key={id} id={id} title={title} items={grouped[id] || []} onOpen={setSelected}/>) }
      </div>
    </DndContext>
    {selected && <DevelopmentModal
      item={selected}
      labels={labels}
      onClose={() => setSelected(null)}
      onMove={(stage) => void move(selected.id, stage)}
      onStatus={(status, reason) => void updateItem(selected.id, { status, waiting_reason: reason || null })}
      onLabels={(labelIds) => void updateItem(selected.id, { label_ids: labelIds })}
      onComment={(body) => void addComment(selected.id, body)}
      onCreateProduction={(quantity) => void createProduction(selected.id, quantity)}
      onDelete={() => void removeDevelopment(selected.id)}
    />}
  </div>
}
