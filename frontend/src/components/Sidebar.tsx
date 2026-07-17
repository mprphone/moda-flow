import { LayoutDashboard, Columns3, Factory, ShoppingBag, UsersRound, Sparkles, type LucideIcon } from 'lucide-react'

type Props = { active: string; onChange: (value: string) => void }

const items: Array<[string, string, LucideIcon]> = [
  ['today', 'Hoje', LayoutDashboard],
  ['board', 'Quadros', Columns3],
  ['production', 'Produções', Factory],
  ['shopping', 'Shopping', ShoppingBag],
  ['partners', 'Clientes e fornecedores', UsersRound],
]

export function Sidebar({ active, onChange }: Props) {
  return <aside className="sidebar">
    <div className="brand"><Sparkles size={22}/><div><strong>Moda Flow</strong><small>atelier inteligente</small></div></div>
    <nav>{items.map(([id, label, Icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={18}/>{label}</button>)}</nav>
    <div className="sidebar-tip"><strong>Modo simples</strong><span>Arraste cartões. O sistema regista tempos, histórico e alertas.</span></div>
  </aside>
}
