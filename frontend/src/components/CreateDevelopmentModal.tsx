import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { UploadInput } from './UploadInput'
import type { Client, Development } from '../types'

export function CreateDevelopmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: (item: Development) => void }) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [form, setForm] = useState({ code: '', title: '', client_id: '', owner_name: user?.name || '', cover_url: '', due_date: '' })
  useEffect(() => { api.get<Client[]>('/clients').then(setClients) }, [])
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const item = await api.post<Development>('/developments', { ...form, client_id: Number(form.client_id), due_date: form.due_date || null, cover_url: form.cover_url || null })
    onCreated(item)
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="create-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={onClose}><X/></button><h2>Novo desenvolvimento</h2><p>Só o essencial. Pode completar o resto mais tarde.</p><label>Código<input required value={form.code} onChange={e=>setForm({...form, code:e.target.value})}/></label><label>Nome curto<input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/></label><label>Cliente<select required value={form.client_id} onChange={e=>setForm({...form, client_id:e.target.value})}><option value="">Selecionar...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Responsável<input required value={form.owner_name} onChange={e=>setForm({...form, owner_name:e.target.value})}/></label><UploadInput value={form.cover_url} onChange={url=>setForm({...form, cover_url:url})} label="Fotografia do desenho"/><label>Prazo<input type="date" value={form.due_date} onChange={e=>setForm({...form, due_date:e.target.value})}/></label><button className="primary-button" type="submit">Criar cartão</button></form></div>
}
