import { useEffect, useState } from 'react'
import { Building2, Factory, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Client, Score, Supplier } from '../types'

const EMPTY_CLIENT = { name: '', group_name: '', email: '', phone: '', contact_person: '', segments: '', preferred_channel: '', meetings: '', notes: '' }
const EMPTY_SUPPLIER = { name: '', category: 'geral', email: '', phone: '', contact_person: '', preferred_channel: '', meetings: '', notes: '' }

export function PartnersPage() {
  const [clients, setClients] = useState<Score[]>([])
  const [suppliers, setSuppliers] = useState<Score[]>([])
  const [creating, setCreating] = useState<'client' | 'supplier' | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [clientDetails, setClientDetails] = useState<Client[]>([])
  const [supplierDetails, setSupplierDetails] = useState<Supplier[]>([])
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT)
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER)

  const load = () => {
    api.get<Score[]>('/clients/scores').then(setClients)
    api.get<Score[]>('/suppliers/scores').then(setSuppliers)
    api.get<Client[]>('/clients').then(setClientDetails)
    api.get<Supplier[]>('/suppliers').then(setSupplierDetails)
  }
  useEffect(() => { load() }, [])

  async function submitClient(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...clientForm, group_name: clientForm.group_name || null, notes: clientForm.notes || null }
    if (editingId) await api.patch(`/clients/${editingId}`, payload)
    else await api.post('/clients', payload)
    setCreating(null)
    setClientForm(EMPTY_CLIENT)
    toast('success', editingId ? 'Cliente atualizado.' : 'Cliente criado.')
    setEditingId(null)
    load()
  }

  async function submitSupplier(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...supplierForm, email: supplierForm.email || null, phone: supplierForm.phone || null }
    if (editingId) await api.patch(`/suppliers/${editingId}`, payload)
    else await api.post('/suppliers', payload)
    setCreating(null)
    setSupplierForm(EMPTY_SUPPLIER)
    toast('success', editingId ? 'Fornecedor atualizado.' : 'Fornecedor criado.')
    setEditingId(null)
    load()
  }

  function edit(item: Score, type: 'client' | 'supplier') {
    if (type === 'client') {
      const detail = clientDetails.find(value => value.id === item.client_id)
      if (!detail) return
      setClientForm({
        name: detail.name, group_name: detail.group_name || '', email: detail.email || '', phone: detail.phone || '',
        contact_person: detail.contact_person || '', segments: detail.segments || '',
        preferred_channel: detail.preferred_channel || '', meetings: detail.meetings || '', notes: detail.notes || '',
      })
      setEditingId(detail.id)
    } else {
      const detail = supplierDetails.find(value => value.id === item.supplier_id)
      if (!detail) return
      setSupplierForm({
        name: detail.name, category: detail.category, email: detail.email || '', phone: detail.phone || '',
        contact_person: detail.contact_person || '', preferred_channel: detail.preferred_channel || '',
        meetings: detail.meetings || '', notes: detail.notes || '',
      })
      setEditingId(detail.id)
    }
    setCreating(type)
  }

  async function remove(item: Score, type: 'client' | 'supplier') {
    const id = type === 'client' ? item.client_id : item.supplier_id
    if (!id || !window.confirm(`Eliminar ${item.name}?`)) return
    await api.del(`/${type === 'client' ? 'clients' : 'suppliers'}/${id}`)
    toast('success', `${type === 'client' ? 'Cliente' : 'Fornecedor'} eliminado.`); load()
  }

  function closeModal() { setCreating(null); setEditingId(null); setClientForm(EMPTY_CLIENT); setSupplierForm(EMPTY_SUPPLIER) }

  const Card = ({ item, type }: { item: Score; type: 'client' | 'supplier' }) => {
  const detail = type === 'client'
    ? clientDetails.find(c => c.id === item.client_id)
    : supplierDetails.find(s => s.id === item.supplier_id)
  const contactBits = detail
    ? [detail.contact_person, detail.phone, detail.email, (detail as Client).segments].filter(Boolean)
    : []
  return <article className="score-card">
    <div className="score-icon">{type === 'client' ? <Building2/> : <Factory/>}</div>
    <div className="score-content">
      <div className="score-head"><div><h3>{item.name}</h3><p>{item.summary}</p></div><div className={`grade grade-${item.grade}`}>{item.grade}</div></div>
      {contactBits.length > 0 && <div className="partner-contact">{contactBits.join(' · ')}</div>}
      <div className="score-bar"><span style={{width:`${item.score}%`}}></span></div>
      <div className="score-metrics">
        {type === 'client'
          ? <><span>Modelos <b>{item.total_developments ?? '—'}</b></span><span>Aprovação <b>{item.approval_rate}%</b></span><span>Cancela/reprova <b>{item.cancel_rate ?? 0}%</b></span></>
          : <><span>No prazo <b>{item.on_time_rate}%</b></span><span>Pedidos ativos <b>{item.active_requests}</b></span>{(item.fabric_total ?? 0) > 0 && <span>Malhas <b>{item.fabric_total}</b>{item.fabric_avg_days != null && <> · entrega ~<b>{item.fabric_avg_days} d</b></>}</span>}</>}
      </div>
      {type === 'client' && (item.tastes?.length || item.avoids?.length) ? <div className="taste-row">
        {item.tastes && item.tastes.length > 0 && <span className="taste-group">Gosta: {item.tastes.map(word => <em className="chip tone-mint" key={word}>{word}</em>)}</span>}
        {item.avoids && item.avoids.length > 0 && <span className="taste-group">Rejeita: {item.avoids.map(word => <em className="chip tone-pink" key={word}>{word}</em>)}</span>}
      </div> : null}
      <div className="partner-actions"><button onClick={() => edit(item, type)}><Pencil size={14}/>Editar</button><button className="danger" onClick={() => void remove(item, type)}><Trash2 size={14}/>Eliminar</button></div>
    </div>
  </article>
  }

  return <div className="content-page">
    <div className="page-heading">
      <div><h1>Clientes e fornecedores</h1><p>Classificação calculada automaticamente pelo histórico real.</p></div>
      <div className="heading-actions">
        <button className="primary-button" onClick={() => { setEditingId(null); setClientForm(EMPTY_CLIENT); setCreating('client') }}>+ Novo cliente</button>
        <button className="primary-button" onClick={() => { setEditingId(null); setSupplierForm(EMPTY_SUPPLIER); setCreating('supplier') }}>+ Novo fornecedor</button>
      </div>
    </div>
    <div className="two-columns">
      <section><h2>Clientes</h2><div className="score-list">{clients.map(item => <Card key={item.name} item={item} type="client"/>)}</div></section>
      <section><h2>Fornecedores</h2><div className="score-list">{suppliers.map(item => <Card key={item.name} item={item} type="supplier"/>)}</div></section>
    </div>
    {creating === 'client' && <div className="modal-backdrop" onMouseDown={closeModal}>
      <form className="create-modal wide" onSubmit={submitClient} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={closeModal}><X/></button>
        <h2>{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
        <p>Ficha do cliente. Só o nome é obrigatório.</p>
        <div className="form-grid">
          <label>Nome *<input required value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })}/></label>
          <label>Grupo<input value={clientForm.group_name} onChange={e => setClientForm({ ...clientForm, group_name: e.target.value })} placeholder="ex.: Inditex"/></label>
          <label>Pessoa a contactar<input value={clientForm.contact_person} onChange={e => setClientForm({ ...clientForm, contact_person: e.target.value })}/></label>
          <label>Segmentos<input value={clientForm.segments} onChange={e => setClientForm({ ...clientForm, segments: e.target.value })} placeholder="Mulher, Criança, Homem..."/></label>
          <label>Email<input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })}/></label>
          <label>Telefone<input type="tel" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}/></label>
          <label>Contacto preferido<select value={clientForm.preferred_channel} onChange={e => setClientForm({ ...clientForm, preferred_channel: e.target.value })}>
            <option value="">—</option><option value="email">Email</option><option value="telefone">Telefone</option><option value="whatsapp">WhatsApp</option><option value="presencial">Presencial</option>
          </select></label>
        </div>
        <label>Reuniões / histórico de contacto<textarea value={clientForm.meetings} onChange={e => setClientForm({ ...clientForm, meetings: e.target.value })} placeholder="Datas de reuniões, decisões, próximos passos..."/></label>
        <label>Notas<input value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}/></label>
        <button className="primary-button" type="submit">{editingId ? 'Guardar alterações' : 'Criar cliente'}</button>
      </form>
    </div>}
    {creating === 'supplier' && <div className="modal-backdrop" onMouseDown={closeModal}>
      <form className="create-modal wide" onSubmit={submitSupplier} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={closeModal}><X/></button>
        <h2>{editingId ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
        <p>Ficha do fornecedor. Os prazos prometidos vão alimentando a classificação.</p>
        <div className="form-grid">
          <label>Nome *<input required value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}/></label>
          <label>Categoria<select value={supplierForm.category} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}>
            <option value="geral">Geral</option><option value="malhas">Malhas</option><option value="tingimento">Tingimento</option><option value="acessorios">Acessórios</option><option value="confecao">Confeção</option>
          </select></label>
          <label>Pessoa a contactar<input value={supplierForm.contact_person} onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}/></label>
          <label>Contacto preferido<select value={supplierForm.preferred_channel} onChange={e => setSupplierForm({ ...supplierForm, preferred_channel: e.target.value })}>
            <option value="">—</option><option value="email">Email</option><option value="telefone">Telefone</option><option value="whatsapp">WhatsApp</option><option value="presencial">Presencial</option>
          </select></label>
          <label>Email<input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}/></label>
          <label>Telefone<input type="tel" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}/></label>
        </div>
        <label>Reuniões / histórico de contacto<textarea value={supplierForm.meetings} onChange={e => setSupplierForm({ ...supplierForm, meetings: e.target.value })} placeholder="Datas de reuniões, condições negociadas, próximos passos..."/></label>
        <label>Notas<input value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })}/></label>
        <button className="primary-button" type="submit">{editingId ? 'Guardar alterações' : 'Criar fornecedor'}</button>
      </form>
    </div>}
  </div>
}
