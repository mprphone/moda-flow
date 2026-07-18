import { LayoutDashboard, Columns3, Shirt, Factory, ShoppingBag, UsersRound, UserCog, Scroll, Sparkles, Link2, BarChart3, X, type LucideIcon } from 'lucide-react'

type Props = { active: string; onChange: (value: string) => void; mobileOpen?: boolean; onClose?: () => void }

const items: Array<[string, string, LucideIcon]> = [
  ['today', 'Hoje', LayoutDashboard],
  ['board', 'Pedidos & Referências', Columns3],
  ['samples', 'Desenvolvimento de amostras', Shirt],
  ['fabrics', 'Malhas', Scroll],
  ['production', 'Produções industriais', Factory],
  ['reconciliation', 'Revisão de ligações', Link2],
  ['shopping', 'Shopping', ShoppingBag],
  ['partners', 'Clientes e fornecedores', UsersRound],
  ['reports', 'Relatórios', BarChart3],
  ['team', 'Equipa', UserCog],
]

export function Sidebar({ active, onChange, mobileOpen, onClose }: Props) {
  function pick(id: string) { onChange(id); onClose?.() }
  return <>
    <div className={`sidebar-backdrop ${mobileOpen ? 'open' : ''}`} onClick={onClose}/>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand">
        <Sparkles size={22}/><div><strong>Moda Flow</strong><small>atelier inteligente</small></div>
        <button className="sidebar-close" onClick={onClose} title="Fechar menu"><X size={20}/></button>
      </div>
      <nav>{items.map(([id, label, Icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => pick(id)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="sidebar-tip"><strong>Modo simples</strong><span>Arraste cartões. O sistema regista tempos, histórico e alertas.</span></div>
    </aside>
  </>
}
