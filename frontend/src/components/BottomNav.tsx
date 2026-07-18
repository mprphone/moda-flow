import { LayoutDashboard, Columns3, Shirt, Factory, MoreHorizontal, type LucideIcon } from 'lucide-react'

type Props = { active: string; onChange: (value: string) => void; onMore: () => void }

// Secções principais no fundo; as restantes ficam em "Mais" (a gaveta lateral).
const tabs: Array<[string, string, LucideIcon]> = [
  ['today', 'Hoje', LayoutDashboard],
  ['board', 'Pedidos', Columns3],
  ['samples', 'Amostras', Shirt],
  ['production', 'Produção', Factory],
]

export function BottomNav({ active, onChange, onMore }: Props) {
  const inMore = !tabs.some(([id]) => id === active)
  return <nav className="bottom-nav">
    {tabs.map(([id, label, Icon]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}>
      <Icon size={21}/><span>{label}</span>
    </button>)}
    <button className={inMore ? 'active' : ''} onClick={onMore}><MoreHorizontal size={21}/><span>Mais</span></button>
  </nav>
}
