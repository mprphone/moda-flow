import { useEffect, useMemo, useState } from 'react'
import { Shirt, Factory, ShoppingBag, Scroll } from 'lucide-react'
import { api } from '../api/client'

type Summary = {
  start: string
  end: string
  developments: { total: number; approved: number; by_client: { name: string; count: number }[] }
  productions: { total: number; quantity: number; by_client: { name: string; count: number; quantity: number }[] }
  shopping: { total: number; amount: number; by_brand: { name: string; count: number; amount: number }[] }
  fabrics: { total: number; by_supplier: { name: string; count: number }[] }
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function firstDay(year: number, month: number) { return `${year}-${String(month + 1).padStart(2, '0')}-01` }
function lastDay(year: number, month: number) { const d = new Date(year, month + 1, 0); return `${year}-${String(month + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function ReportsPage() {
  const now = new Date()
  const [mode, setMode] = useState<'month' | 'range'>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [start, setStart] = useState(firstDay(now.getFullYear(), now.getMonth()))
  const [end, setEnd] = useState(lastDay(now.getFullYear(), now.getMonth()))
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  const period = useMemo(() => mode === 'month'
    ? { start: firstDay(year, month), end: lastDay(year, month) }
    : { start, end },
    [mode, year, month, start, end])

  useEffect(() => {
    setLoading(true)
    api.get<Summary>(`/reports/summary?start=${period.start}&end=${period.end}`)
      .then(setData).finally(() => setLoading(false))
  }, [period.start, period.end])

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return <div className="content-page">
    <div className="page-heading">
      <div><h1>Relatórios</h1><p>Escolha um mês ou um intervalo de datas para ver os números do período.</p></div>
    </div>

    <div className="report-controls">
      <div className="report-mode">
        <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Por mês</button>
        <button className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Intervalo de datas</button>
      </div>
      {mode === 'month'
        ? <div className="report-period">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        : <div className="report-period">
            <label>De <input type="date" value={start} onChange={e => setStart(e.target.value)}/></label>
            <label>até <input type="date" value={end} onChange={e => setEnd(e.target.value)}/></label>
          </div>}
    </div>

    {loading && <div className="loading">A calcular...</div>}
    {data && !loading && <div className="report-grid">
      <ReportCard icon={<Shirt/>} tone="lilac" title="Peças desenvolvidas" big={data.developments.total}
        note={`${data.developments.approved} aprovadas no período`}
        rows={data.developments.by_client.map(c => ({ label: c.name, value: `${c.count}` }))}/>

      <ReportCard icon={<Factory/>} tone="mint" title="Produções" big={data.productions.total}
        note={`${data.productions.quantity.toLocaleString('pt-PT')} unidades no total`}
        rows={data.productions.by_client.map(c => ({ label: c.name, value: `${c.count} · ${c.quantity.toLocaleString('pt-PT')} un.` }))}/>

      <ReportCard icon={<ShoppingBag/>} tone="peach" title="Gastos em shopping" big={`${data.shopping.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €`}
        note={`${data.shopping.total} compras no período`}
        rows={data.shopping.by_brand.map(b => ({ label: b.name, value: `${b.amount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €` }))}/>

      <ReportCard icon={<Scroll/>} tone="sky" title="Malhas pedidas" big={data.fabrics.total}
        note="pedidos de malha no período"
        rows={data.fabrics.by_supplier.map(s => ({ label: s.name, value: `${s.count}` }))}/>
    </div>}
  </div>
}

function ReportCard({ icon, tone, title, big, note, rows }: {
  icon: React.ReactNode; tone: string; title: string; big: number | string; note: string
  rows: { label: string; value: string }[]
}) {
  return <article className="report-card">
    <div className={`report-head tone-${tone}`}>{icon}<div><span>{title}</span><strong>{big}</strong></div></div>
    <p className="report-note">{note}</p>
    <div className="report-rows">
      {rows.length === 0 && <span className="empty-note">Sem dados neste período.</span>}
      {rows.slice(0, 8).map(r => <div className="report-row" key={r.label}><span>{r.label}</span><b>{r.value}</b></div>)}
      {rows.length > 8 && <div className="report-row more">+ {rows.length - 8} outros</div>}
    </div>
  </article>
}
