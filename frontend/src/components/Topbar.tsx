import { Bell, LogOut, Plus, Search } from 'lucide-react'
import { useAuth } from '../auth'

export function Topbar({ onCreate }: { onCreate: () => void }) {
  const { user, logout } = useAuth()
  const initials = (user?.name || '?').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
  return <header className="topbar">
    <span className="topbar-brand">Moda Flow</span>
    <div className="search"><Search size={18}/><input placeholder="Pesquisar modelos, clientes ou fornecedores..."/></div>
    <button className="icon-button bell-button"><Bell size={18}/></button>
    <button className="primary-button" onClick={onCreate}><Plus size={18}/><span className="btn-label">Novo pedido</span></button>
    <div className="avatar" title={user?.name}>{initials}</div>
    <button className="icon-button" title="Terminar sessão" onClick={logout}><LogOut size={18}/></button>
  </header>
}
