import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Production } from '../types'

type Response = { stages: string[]; items: Production[] }

const STAGE_NAMES: Record<string, string> = {
  encomenda_recebida: 'Encomenda recebida',
  materiais: 'Materiais',
  corte: 'Corte',
  confecao: 'Confeção',
  controlo_qualidade: 'Controlo qualidade',
  expedida: 'Expedida',
}

export function ProductionPage() {
  const [data, setData] = useState<Response>({ stages: [], items: [] })
  const load = () => api.get<Response>('/productions').then(setData)
  useEffect(() => { void load() }, [])

  async function updateStatus(id: number, status: string) {
    const updated = await api.patch<Production>(`/productions/${id}`, { status })
    setData(current => ({ ...current, items: current.items.map(item => item.id === id ? updated : item) }))
    toast('success', `Produção atualizada para "${STAGE_NAMES[status] || status}".`)
  }

  return <div className="content-page">
    <div className="page-heading"><div><h1>Produções</h1><p>As produções nascem diretamente da versão aprovada. Atualize o estado em cada linha.</p></div></div>
    <div className="production-table">
      <div className="table-head"><span>Modelo</span><span>Cliente</span><span>Quantidade</span><span>Estado</span><span>Prazo</span><span>Responsável</span></div>
      {data.items.map(item => <div className="table-row" key={item.id}>
        <strong>{item.development_code}</strong>
        <span>{item.client_name}</span>
        <span>{item.quantity}</span>
        <select className="status-select" value={item.status} onChange={e => void updateStatus(item.id, e.target.value)}>
          {data.stages.map(stage => <option key={stage} value={stage}>{STAGE_NAMES[stage] || stage}</option>)}
        </select>
        <span>{item.due_date || '—'}</span>
        <span>{item.responsible_name || '—'}</span>
      </div>)}
      {data.items.length === 0 && <div className="table-row"><span>Sem produções registadas.</span></div>}
    </div>
  </div>
}
