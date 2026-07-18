import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Wand2 } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import { UploadInput } from './UploadInput'
import type { Client, Development, User } from '../types'

const SOURCES = [
  ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['reuniao', 'Reunião'],
  ['telefone', 'Telefone'], ['outro', 'Outro'],
]

type ModelRow = { title: string; user_ids: number[]; quantity: string; cover_url: string; code: string }
const EMPTY_MODEL: ModelRow = { title: '', user_ids: [], quantity: '', cover_url: '', code: '' }

export function CreateDevelopmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: Development) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<User[]>([])
  const [order, setOrder] = useState({ client_id: '', request_source: 'whatsapp', request_group: '', request_notes: '', due_date: '' })
  const [models, setModels] = useState<ModelRow[]>([{ ...EMPTY_MODEL }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get<Client[]>('/clients').then(setClients)
    api.get<User[]>('/users').then(setTeam).catch(() => undefined)
  }, [])

  const client = clients.find(c => c.id === Number(order.client_id))
  const designers = team.filter(t => t.role === 'designer' || t.role === 'admin')

  // Iniciais: 1 designer -> as suas (IF); parceria -> primeira letra do 1.º nome de cada (IJ)
  function initialsFor(ids: number[]): string {
    const chosen = ids.map(id => team.find(t => t.id === id)).filter(Boolean) as User[]
    if (chosen.length === 0) return ''
    if (chosen.length === 1) return (chosen[0].initials || '').toUpperCase()
    return chosen.map(d => (d.name.trim()[0] || '').toUpperCase()).join('')
  }
  function ownerName(ids: number[]): string {
    const names = ids.map(id => team.find(t => t.id === id)?.name).filter(Boolean)
    return names.length ? names.join(' + ') : 'Por distribuir'
  }

  function updateModel(i: number, patch: Partial<ModelRow>) {
    setModels(current => current.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }
  function toggleDesigner(i: number, userId: number) {
    setModels(current => current.map((m, idx) => idx !== i ? m
      : { ...m, user_ids: m.user_ids.includes(userId) ? m.user_ids.filter(x => x !== userId) : [...m.user_ids, userId] }))
  }
  function addModel() { setModels(current => [...current, { ...EMPTY_MODEL }]) }
  function removeModel(i: number) { setModels(current => current.length > 1 ? current.filter((_, idx) => idx !== i) : current) }

  async function generateReferences() {
    if (!client) { toast('error', 'Escolha primeiro o cliente.'); return }
    if (!client.code) { toast('error', `O cliente ${client.name} ainda não tem código de referência. Defina-o na ficha do cliente.`); return }
    try {
      const res = await api.get<{ sequence: number }>(`/developments/next-reference?client_id=${order.client_id}`)
      let seq = res.sequence
      setModels(current => current.map(m => {
        const ini = initialsFor(m.user_ids)
        const code = `${ini ? ini + '_' : ''}${client.code}_${String(seq).padStart(3, '0')}`
        seq += 1
        return { ...m, code }
      }))
      toast('success', 'Referências geradas. Pode ajustar antes de guardar.')
    } catch { /* erro já mostrado */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!order.client_id) { toast('error', 'Escolha o cliente.'); return }
    const valid = models.filter(m => m.title.trim() && m.code.trim())
    if (valid.length === 0) { toast('error', 'Cada modelo precisa de peça e referência.'); return }
    setSaving(true)
    try {
      let first: Development | null = null
      for (const m of valid) {
        const created = await api.post<Development>('/developments', {
          code: m.code.trim(),
          title: m.title.trim(),
          client_id: Number(order.client_id),
          owner_name: ownerName(m.user_ids),
          cover_url: m.cover_url || null,
          due_date: order.due_date || null,
          request_source: order.request_source,
          request_group: order.request_group || null,
          requested_quantity: m.quantity ? Number(m.quantity) : null,
          request_notes: order.request_notes || null,
        })
        // regista a parceria: 1.ª designer = principal, restantes = parceria
        for (let idx = 0; idx < m.user_ids.length; idx++) {
          await api.post(`/developments/${created.id}/assignees`, { user_id: m.user_ids[idx], role: idx === 0 ? 'principal' : 'parceria' }).catch(() => undefined)
        }
        if (!first) first = created
      }
      toast('success', valid.length === 1 ? 'Pedido criado.' : `Pedido criado com ${valid.length} modelos.`)
      if (first) onCreated(first)
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="create-modal wide" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose}><X/></button>
      <h2>Novo pedido do cliente</h2>
      <p>Registe o briefing. Um pedido pode ter vários modelos — cada um pode ser de uma designer ou de uma parceria, e recebe a sua referência.</p>

      <div className="form-grid two">
        <label>Cliente *<select required value={order.client_id} onChange={e => setOrder({ ...order, client_id: e.target.value })}>
          <option value="">Selecionar...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
        </select></label>
        <label>Origem do pedido<select value={order.request_source} onChange={e => setOrder({ ...order, request_source: e.target.value })}>
          {SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Pedido / campanha<input placeholder="Ex.: Brownie julho" value={order.request_group} onChange={e => setOrder({ ...order, request_group: e.target.value })}/></label>
        <label>Data pretendida pelo cliente<input type="date" value={order.due_date} onChange={e => setOrder({ ...order, due_date: e.target.value })}/></label>
      </div>
      <label>Briefing recebido<textarea rows={2} placeholder="O que o cliente pediu, tipo de peça, cores, referências, observações..." value={order.request_notes} onChange={e => setOrder({ ...order, request_notes: e.target.value })}/></label>

      <div className="models-head">
        <strong>Modelos pedidos ({models.length})</strong>
        <button type="button" className="team-action" onClick={() => void generateReferences()}><Wand2 size={14}/> Gerar referências</button>
      </div>
      <div className="models-list">
        {models.map((m, i) => <div className="model-row" key={i}>
          <div className="model-num">{i + 1}</div>
          <div className="model-fields">
            <input className="model-title" required placeholder="Peça / descrição *" value={m.title} onChange={e => updateModel(i, { title: e.target.value })}/>
            <div className="model-designers">
              <span className="model-designers-label">Designer / parceria:</span>
              {designers.map(d => <button type="button" key={d.id}
                className={`designer-chip ${m.user_ids.includes(d.id) ? 'on' : ''}`}
                onClick={() => toggleDesigner(i, d.id)}>{d.name}{d.initials ? ` (${d.initials})` : ''}</button>)}
            </div>
            <div className="model-line">
              <input type="number" min="1" className="model-qty" placeholder="Quantidade" value={m.quantity} onChange={e => updateModel(i, { quantity: e.target.value })}/>
              <input className="model-code" placeholder="Referência" value={m.code} onChange={e => updateModel(i, { code: e.target.value.toUpperCase() })}/>
            </div>
            <UploadInput value={m.cover_url} onChange={url => updateModel(i, { cover_url: url })} label={`Foto do modelo ${i + 1}`}/>
          </div>
          {models.length > 1 && <button type="button" className="model-remove" onClick={() => removeModel(i)}><Trash2 size={15}/></button>}
        </div>)}
      </div>
      <button type="button" className="add-model" onClick={addModel}><Plus size={16}/> Adicionar modelo</button>

      <button className="primary-button" type="submit" disabled={saving}>{saving ? 'A criar...' : `Criar pedido${models.length > 1 ? ` (${models.length} modelos)` : ''}`}</button>
    </form>
  </div>
}
