import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api/client'
import { UploadInput } from './UploadInput'
import type { Client, Development, User } from '../types'

const SOURCES = [
  ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['reuniao', 'Reunião'],
  ['telefone', 'Telefone'], ['outro', 'Outro'],
]

export function CreateDevelopmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: Development) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [team, setTeam] = useState<User[]>([])
  const [form, setForm] = useState({
    code: '', title: '', client_id: '', owner_name: 'Por distribuir', cover_url: '', due_date: '', request_group: '',
    request_source: 'whatsapp', requested_quantity: '', request_notes: '',
  })

  useEffect(() => {
    api.get<Client[]>('/clients').then(setClients)
    api.get<User[]>('/users').then(setTeam).catch(() => undefined)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const item = await api.post<Development>('/developments', {
      ...form,
      client_id: Number(form.client_id),
      due_date: form.due_date || null,
      cover_url: form.cover_url || null,
      requested_quantity: form.requested_quantity ? Number(form.requested_quantity) : null,
      request_notes: form.request_notes || null,
    })
    onCreated(item)
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="create-modal wide" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
      <button type="button" className="modal-close" onClick={onClose}><X/></button>
      <h2>Novo pedido do cliente</h2>
      <p>Registe o briefing e crie a primeira referência. Depois pode juntar mais fotografias e distribuir o trabalho.</p>
      <div className="form-grid two">
        <label>Cliente *<select required value={form.client_id} onChange={event => setForm({ ...form, client_id: event.target.value })}>
          <option value="">Selecionar...</option>{clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select></label>
        <label>Origem do pedido<select value={form.request_source} onChange={event => setForm({ ...form, request_source: event.target.value })}>
          {SOURCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Pedido / campanha<input placeholder="Ex.: Brownie julho" value={form.request_group} onChange={event => setForm({ ...form, request_group: event.target.value })}/></label>
        <label>Código / referência *<input required value={form.code} onChange={event => setForm({ ...form, code: event.target.value })}/></label>
        <label>Peça / descrição curta *<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label>
        <label>Quantidade pretendida<input type="number" min="1" value={form.requested_quantity} onChange={event => setForm({ ...form, requested_quantity: event.target.value })}/></label>
        <label>Designer (pode distribuir depois)<select value={form.owner_name} onChange={event => setForm({ ...form, owner_name: event.target.value })}>
          <option value="Por distribuir">Por distribuir</option>
          {team.map(person => <option key={person.id} value={person.name}>{person.name}</option>)}
        </select></label>
      </div>
      <label>Briefing recebido<textarea rows={3} placeholder="O que o cliente pediu, tipo de peça, cores, referências, observações..." value={form.request_notes} onChange={event => setForm({ ...form, request_notes: event.target.value })}/></label>
      <UploadInput value={form.cover_url} onChange={url => setForm({ ...form, cover_url: url })} label="Fotografia enviada pelo cliente"/>
      <label>Data pretendida pelo cliente<input type="date" value={form.due_date} onChange={event => setForm({ ...form, due_date: event.target.value })}/></label>
      <button className="primary-button" type="submit">Criar pedido e referência</button>
    </form>
  </div>
}
