import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3, ShoppingBag, Truck, UsersRound } from 'lucide-react'
import { api } from '../api/client'
import type { Development, ShoppingPurchase } from '../types'

type Dashboard = {
  overdue_count: number
  blocked_count: number
  waiting_supplier_count: number
  waiting_client_count: number
  shopping_deadline_count: number
  priorities: Development[]
  shopping_alerts: ShoppingPurchase[]
}

export function TodayPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  useEffect(() => { api.get<Dashboard>('/dashboard').then(setData) }, [])
  if (!data) return <div className="loading">A carregar prioridades...</div>
  const stats = [
    [data.overdue_count, 'Prazos ultrapassados', AlertTriangle, 'peach'],
    [data.waiting_supplier_count, 'Aguardam fornecedor', Truck, 'yellow'],
    [data.waiting_client_count, 'Aguardam cliente', UsersRound, 'lilac'],
    [data.shopping_deadline_count, 'Devoluções urgentes', ShoppingBag, 'mint'],
  ]
  return <div className="content-page">
    <div className="page-heading"><div><h1>Bom dia 👋</h1><p>Prioridades ordenadas automaticamente: prazo, risco, bloqueios e valor.</p></div></div>
    <div className="stats-grid">{stats.map(([value, label, Icon, tone]: any) => <div className={`stat-card ${tone}`} key={label}><Icon/><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="two-columns">
      <section className="panel">
        <h2><AlertTriangle size={20}/>O que fazer primeiro</h2>
        {data.priorities.length === 0 && <p className="empty-note">Nada urgente. Bom trabalho!</p>}
        {data.priorities.map((item, index) => <div className="attention-row" key={item.id}>
          <span className="priority-rank">{index + 1}</span>
          <div><strong>{item.code} — {item.title}</strong><span>{item.client_name} · {item.next_action}</span></div>
          <div className={`risk-pill ${item.risk}`}><Clock3 size={14}/>{item.days_in_stage} d</div>
        </div>)}
      </section>
      <section className="panel">
        <h2><ShoppingBag size={20}/>Shopping a tratar</h2>
        {data.shopping_alerts.length === 0 && <p className="empty-note">Sem devoluções urgentes.</p>}
        {data.shopping_alerts.map(item => <div className="attention-row" key={item.id}>
          <img src={item.cover_url} alt=""/>
          <div><strong>{item.brand} {item.reference}</strong><span>{item.invoice_number || 'Sem fatura'} · €{item.amount.toFixed(2)}</span></div>
          <div className="risk-pill medium">{item.days_to_return} d</div>
        </div>)}
      </section>
    </div>
  </div>
}
