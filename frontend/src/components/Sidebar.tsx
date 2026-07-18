import { LayoutDashboard, Columns3, Shirt, Factory, ShoppingBag, UsersRound, UserCog, Scroll, Sparkles, Link2, type LucideIcon } from 'lucide-react'

type Props = { active: string; onChange: (value: string) => void }

const items: Array<[string, string, LucideIcon]> = [
  ['today', 'Hoje', LayoutDashboard],
  ['board', 'Portefólio & Modelos', Columns3],
  ['samples', 'Desenvolvimento de amostras', Shirt],
  ['fabrics', 'Malhas', Scroll],
  ['production', 'Produções industriais', Factory],
  ['reconciliation', 'Revisão de ligações', Link2],
  ['shopping', 'Shopping', ShoppingBag],
  ['partners', 'Clientes e fornecedores', UsersRound],
  ['team', 'Equipa', UserCog],
]

export function Sidebar({ active, onChange }: Props) {
  return <aside className="sidebar">
    <div className="brand"><Sparkles size={22}/><div><strong>Moda Flow</strong><small>atelier inteligente</small></div></div>
    <nav>{items.map(([id, label, Icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}><Icon size={18}/>{label}</button>)}</nav>
    <div className="sidebar-tip"><strong>Modo simples</strong><span>Arraste cartões. O sistema regista tempos, histórico e alertas.</span></div>
  </aside>
}
