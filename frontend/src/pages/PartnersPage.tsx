import { useEffect, useState } from 'react'
import { Building2, Factory, X } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Score } from '../types'

const EMPTY_CLIENT = { name: '', group_name: '', notes: '' }
const EMPTY_SUPPLIER = { name: '', category: 'geral', email: '', phone: '' }

export function PartnersPage() {
  const [clients, setClients] = useState<Score[]>([])
  const [suppliers, setSuppliers] = useState<Score[]>([])
  const [creating, setCreating] = useState<'client' | 'supplier' | null>(null)
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT)
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER)

  const load = () => {
    api.get<Score[]>('/clients/scores').then(setClients)
    api.get<Score[]>('/suppliers/scores').then(setSuppliers)
  }
  useEffect(() => { load() }, [])

  async function submitClient(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/clients', { ...clientForm, group_name: clientForm.group_name || null, notes: clientForm.notes || null })
    setCreating(null)
    setClientForm(EMPTY_CLIENT)
    toast('success', 'Cliente criado.')
    load()
  }

  async function submitSupplier(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/suppliers', { ...supplierForm, email: supplierForm.email || null, phone: supplierForm.phone || null })
    setCreating(null)
    setSupplierForm(EMPTY_SUPPLIER)
    toast('success', 'Fornecedor criado.')
    load()
  }

  const Card = ({ item, type }: { item: Score; type: 'client' | 'supplier' }) => <article className="score-card"><div className="score-icon">{type === 'client' ? <Building2/> : <Factory/>}</div><div className="score-content"><div className="score-head"><div><h3>{item.name}</h3><p>{item.summary}</p></div><div className={`grade grade-${item.grade}`}>{item.grade}</div></div><div className="score-bar"><span style={{width:`${item.score}%`}}></span></div><div className="score-metrics">{type === 'client' ? <><span>Aprovação <b>{item.approval_rate}%</b></span><span>Versões médias <b>{item.average_versions}</b></span></> : <><span>No prazo <b>{item.on_time_rate}%</b></span><span>Pedidos ativos <b>{item.active_requests}</b></span></>}</div></div></article>

  return <div className="content-page">
    <div className="page-heading">
      <div><h1>Clientes e fornecedores</h1><p>Classificação calculada automaticamente pelo histórico real.</p></div>
      <div className="heading-actions">
        <button className="primary-button" onClick={() => setCreating('client')}>+ Novo cliente</button>
        <button className="primary-button" onClick={() => setCreating('supplier')}>+ Novo fornecedor</button>
      </div>
    </div>
    <div className="two-columns">
      <section><h2>Clientes</h2><div className="score-list">{clients.map(item => <Card key={item.name} item={item} type="client"/>)}</div></section>
      <section><h2>Fornecedores</h2><div className="score-list">{suppliers.map(item => <Card key={item.name} item={item} type="supplier"/>)}</div></section>
    </div>
    {creating === 'client' && <div className="modal-backdrop" onMouseDown={() => setCreating(null)}>
      <form className="create-modal" onSubmit={submitClient} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setCreating(null)}><X/></button>
        <h2>Novo cliente</h2>
        <p>Fica logo disponível ao criar desenvolvimentos.</p>
        <label>Nome<input required value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })}/></label>
        <label>Grupo (opcional)<input value={clientForm.group_name} onChange={e => setClientForm({ ...clientForm, group_name: e.target.value })}/></label>
        <label>Notas (opcional)<input value={clientForm.notes} onChange={e => setClientForm({ ...clientForm, notes: e.target.value })}/></label>
        <button className="primary-button" type="submit">Criar cliente</button>
      </form>
    </div>}
    {creating === 'supplier' && <div className="modal-backdrop" onMouseDown={() => setCreating(null)}>
      <form className="create-modal" onSubmit={submitSupplier} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setCreating(null)}><X/></button>
        <h2>Novo fornecedor</h2>
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
        <button className="primary-button" type="submit">Criar fornecedor</button>
      </form>
    </div>}
  </div>
}
