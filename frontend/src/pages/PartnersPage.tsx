import { useEffect, useState } from 'react'
import { Building2, Factory, Pencil, Trash2, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Client, Score, Supplier } from '../types'

const EMPTY_CLIENT = { name: '', group_name: '', notes: '' }
const EMPTY_SUPPLIER = { name: '', category: 'geral', email: '', phone: '' }

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
      setClientForm({ name: detail.name, group_name: detail.group_name || '', notes: detail.notes || '' })
      setEditingId(detail.id)
    } else {
      const detail = supplierDetails.find(value => value.id === item.supplier_id)
      if (!detail) return
      setSupplierForm({ name: detail.name, category: detail.category, email: detail.email || '', phone: detail.phone || '' })
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

  const Card = ({ item, type }: { item: Score; type: 'client' | 'supplier' }) => <article className="score-card">
    <div className="score-icon">{type === 'client' ? <Building2/> : <Factory/>}</div>
    <div className="score-content">
      <div className="score-head"><div><h3>{item.name}</h3><p>{item.summary}</p></div><div className={`grade grade-${item.grade}`}>{item.grade}</div></div>
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
      <form className="create-modal" onSubmit={submitClient} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={closeModal}><X/></button>
        <h2>{editingId ? 'Editar cliente' : 'Novo cliente'}</h2>
        <p>Fica logo disponível ao criar desenvolvimentos.</p>
        <label>Nome<input required value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })}/></label>
        <label>Grupo (opcional)<input value={clientForm.group_name} onChange={e => setClientForm({ ...clientForm, group_name: e.target.value })}/></label>
        <label>Notas (opcional)<input value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}/></label>
        <button className="primary-button" type="submit">{editingId ? 'Guardar alterações' : 'Criar cliente'}</button>
      </form>
    </div>}
    {creating === 'supplier' && <div className="modal-backdrop" onMouseDown={closeModal}>
      <form className="create-modal" onSubmit={submitSupplier} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={closeModal}><X/></button>
        <h2>{editingId ? 'Editar fornecedor' : 'Novo fornecedor'}</h2>
        <p>Os prazos prometidos vão alimentando a classificação.</p>
        <label>Nome<input required value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}/></label>
        <label>Categoria<select value={supplierForm.category} onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}>
          <option value="geral">Geral</option>
          <option value="malhas">Malhas</option>
          <option value="tingimento">Tingimento</option>
          <option value="acessorios">Acessórios</option>
          <option value="confecao">Confeção</option>
        </select></label>
        <label>Email (opcional)<input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}/></label>
        <label>Telefone (opcional)<input value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}/></label>
        <button className="primary-button" type="submit">{editingId ? 'Guardar alterações' : 'Criar fornecedor'}</button>
      </form>
    </div>}
  </div>
}
