import { useEffect, useState } from 'react'
import { KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, UserRound, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { toast } from '../lib/toast'
import type { TeamUser } from '../types'

const EMPTY_FORM = { name: '', email: '', password: '', phone: '', initials: '', role: 'designer' }

export function TeamPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState<TeamUser[]>([])
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const load = () => api.get<TeamUser[]>('/users').then(setItems)
  useEffect(() => { void load() }, [])

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setCreating(true)
  }
  function editUser(item: TeamUser) {
    setEditingId(item.id)
    setForm({ name: item.name, email: item.email || '', password: '', phone: item.phone || '', initials: item.initials || '', role: item.role })
    setCreating(true)
  }
  function closeModal() { setCreating(false); setEditingId(null); setForm(EMPTY_FORM) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      initials: form.initials || null,
      role: form.role,
      ...(form.password ? { password: form.password } : {}),
    }
    if (editingId) {
      await api.patch(`/users/${editingId}`, { ...payload, ...(form.email && form.password ? { is_active: true } : {}) })
      toast('success', 'Ficha atualizada.')
    } else {
      await api.post('/users', payload)
      toast('success', form.email ? 'Conta criada. Partilhe o acesso com a colega.' : 'Ficha pendente criada.')
    }
    closeModal()
    void load()
  }

  async function toggleActive(item: TeamUser) {
    await api.patch(`/users/${item.id}`, { is_active: !item.is_active })
    toast('success', item.is_active ? 'Conta desativada.' : 'Conta reativada.')
    void load()
  }

  async function resetPassword(item: TeamUser) {
    const password = window.prompt(`Nova palavra-passe para ${item.name} (mínimo 8 carateres):`)
    if (!password) return
    await api.patch(`/users/${item.id}`, { password })
    toast('success', 'Palavra-passe alterada. Comunique-a à colega.')
  }

  async function deleteUser(item: TeamUser) {
    if (!window.confirm(`Eliminar definitivamente a ficha de ${item.name}?`)) return
    await api.del(`/users/${item.id}`)
    toast('success', 'Ficha eliminada.'); void load()
  }

  async function changeMyPassword() {
    const current = window.prompt('A sua palavra-passe atual:')
    if (!current) return
    const next = window.prompt('Nova palavra-passe (mínimo 8 carateres):')
    if (!next) return
    await api.post('/users/me/password', { current_password: current, new_password: next })
    toast('success', 'A sua palavra-passe foi alterada.')
  }

  return <div className="content-page">
    <div className="page-heading">
      <div><h1>Equipa</h1><p>Todas as contas veem toda a informação. A gestão de contas é feita pela administradora.</p></div>
      <div className="heading-actions">
        <button className="action" onClick={() => void changeMyPassword()}><KeyRound size={15}/> Alterar a minha palavra-passe</button>
        {isAdmin && <button className="primary-button" onClick={openNew}><UserPlus size={17}/>Nova conta</button>}
      </div>
    </div>
    <div className="score-list team-list">
      {items.map(item => <article className={`score-card ${item.is_active ? '' : 'inactive-user'}`} key={item.id}>
        <div className="score-icon">{item.role === 'admin' ? <ShieldCheck/> : <UserRound/>}</div>
        <div className="score-content">
          <div className="score-head">
            <div>
              <h3>{item.name}{item.id === user?.id ? ' (eu)' : ''}</h3>
              <p>{item.email || 'Email ainda por preencher'}</p>
            </div>
            <span className={`chip ${item.role === 'admin' ? 'tone-lilac' : 'tone-sky'}`}>{item.role === 'admin' ? 'Administradora' : 'Designer'}</span>
          </div>
          <div className="team-meta">
            {item.phone && <span className="team-phone">📞 {item.phone}</span>}
            {!item.email && <span className="chip tone-yellow">Ficha pendente · sem acesso</span>}
            {item.email && !item.is_active && <span className="chip tone-pink">Conta desativada</span>}
            {isAdmin && <div className="team-actions">
              <button title="Editar ficha" onClick={() => editUser(item)}><Pencil size={14}/> Editar</button>
              {item.email && <button onClick={() => void resetPassword(item)}>Repor palavra-passe</button>}
              {item.email && item.id !== user?.id && <button onClick={() => void toggleActive(item)}>{item.is_active ? 'Desativar' : 'Reativar'}</button>}
              {item.id !== user?.id && <button className="danger" title="Eliminar ficha" onClick={() => void deleteUser(item)}><Trash2 size={14}/> Eliminar</button>}
            </div>}
          </div>
        </div>
      </article>)}
    </div>
    {creating && <div className="modal-backdrop" onMouseDown={closeModal}>
      <form className="create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={closeModal}><X/></button>
        <h2>{editingId ? 'Editar ficha da equipa' : 'Nova conta da equipa'}</h2>
        <p>Email e palavra-passe dão acesso à aplicação. O telefone é opcional.</p>
        <label>Nome<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
        <label>Email<input type="email" placeholder="para dar acesso" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
        <label>{editingId ? 'Nova palavra-passe (deixe vazio para manter)' : 'Palavra-passe inicial'}<input type="text" minLength={8} placeholder="mínimo 8 carateres" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
        <label>Telefone<input type="tel" placeholder="ex.: 912 345 678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label>
        <label>Iniciais de referência<input maxLength={5} placeholder="ex.: IF" value={form.initials} onChange={e => setForm({ ...form, initials: e.target.value.toUpperCase() })}/></label>
        <label>Papel<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="designer">Designer</option>
          <option value="admin">Administradora</option>
        </select></label>
        <button className="primary-button" type="submit">{editingId ? 'Guardar alterações' : (form.email ? 'Criar conta' : 'Criar ficha pendente')}</button>
      </form>
    </div>}
  </div>
}
