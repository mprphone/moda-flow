import { useEffect, useState } from 'react'
import { KeyRound, ShieldCheck, UserPlus, UserRound, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../auth'
import { toast } from '../lib/toast'
import type { TeamUser } from '../types'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'designer' }

export function TeamPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [items, setItems] = useState<TeamUser[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const load = () => api.get<TeamUser[]>('/users').then(setItems)
  useEffect(() => { void load() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await api.post('/users', form)
    setCreating(false)
    setForm(EMPTY_FORM)
    toast('success', 'Conta criada. Partilhe o email e a palavra-passe com a colega.')
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

  async function setupAccess(item: TeamUser) {
    const email = window.prompt(`Email de acesso para ${item.name}:`, item.email || '')
    if (!email) return
    const password = window.prompt('Palavra-passe inicial (mínimo 8 carateres):')
    if (!password) return
    await api.patch(`/users/${item.id}`, { email, password, is_active: true })
    toast('success', `Acesso de ${item.name} ativado.`)
    void load()
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
        {isAdmin && <button className="primary-button" onClick={() => setCreating(true)}><UserPlus size={17}/>Nova conta</button>}
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
            {!item.email && <span className="chip tone-yellow">Ficha pendente · sem acesso</span>}
            {item.email && !item.is_active && <span className="chip tone-pink">Conta desativada</span>}
            {isAdmin && <div className="team-actions">
              {!item.email ? <button onClick={() => void setupAccess(item)}>Completar email e acesso</button> : <button onClick={() => void resetPassword(item)}>Repor palavra-passe</button>}
              {item.email && item.id !== user?.id && <button onClick={() => void toggleActive(item)}>{item.is_active ? 'Desativar' : 'Reativar'}</button>}
            </div>}
          </div>
        </div>
      </article>)}
    </div>
    {creating && <div className="modal-backdrop" onMouseDown={() => setCreating(false)}>
      <form className="create-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={() => setCreating(false)}><X/></button>
        <h2>Nova conta da equipa</h2>
        <p>A colega entra com este email e palavra-passe, e pode depois alterá-la.</p>
        <label>Nome<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label>
        <label>Email (opcional)<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label>
        <label>Palavra-passe inicial (opcional)<input minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
        <label>Papel<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="designer">Designer</option>
          <option value="admin">Administradora</option>
        </select></label>
        <button className="primary-button" type="submit">{form.email ? 'Criar conta' : 'Criar ficha pendente'}</button>
      </form>
    </div>}
  </div>
}
