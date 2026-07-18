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

type ModelRow = { title: string; user_id: string; quantity: string; cover_url: string; code: string }
const EMPTY_MODEL: ModelRow = { title: '', user_id: '', quantity: '', cover_url: '', code: '' }

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
  const designerName = (id: string) => team.find(t => String(t.id) === id)?.name || 'Por distribuir'

  function updateModel(i: number, patch: Partial<ModelRow>) {
    setModels(current => current.map((m, idx) => idx === i ? { ...m, ...patch } : m))
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
        const initials = team.find(t => String(t.id) === m.user_id)?.initials || ''
        const code = `${initials ? initials + '_' : ''}${client.code}_${String(seq).padStart(3, '0')}`
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
          owner_name: designerName(m.user_id),
          cover_url: m.cover_url || null,
          due_date: order.due_date || null,
          request_source: order.request_source,
          request_group: order.request_group || null,
          requested_quantity: m.quantity ? Number(m.quantity) : null,
          request_notes: order.request_notes || null,
        })
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
      <p>Registe o briefing. Um pedido pode ter vários modelos — cada um é atribuído a uma designer e recebe a sua referência.</p>

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
            <div className="model-line">
              <select value={m.user_id} onChange={e => updateModel(i, { user_id: e.target.value })}>
                <option value="">Por distribuir</option>
                {team.map(t => <option key={t.id} value={t.id}>{t.name}{t.initials ? ` (${t.initials})` : ''}</option>)}
              </select>
              <input type="number" min="1" className="model-qty" placeholder="Qtd." value={m.quantity} onChange={e => updateModel(i, { quantity: e.target.value })}/>
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
