import { useEffect, useState } from 'react'
import { Building2, Factory } from 'lucide-react'
import { api } from '../api/client'
import type { Score } from '../types'

export function PartnersPage() {
  const [clients,setClients]=useState<Score[]>([])
  const [suppliers,setSuppliers]=useState<Score[]>([])
  useEffect(()=>{api.get<Score[]>('/clients/scores').then(setClients);api.get<Score[]>('/suppliers/scores').then(setSuppliers)},[])
  const Card=({item,type}:{item:Score;type:'client'|'supplier'})=><article className="score-card"><div className="score-icon">{type==='client'?<Building2/>:<Factory/>}</div><div className="score-content"><div className="score-head"><div><h3>{item.name}</h3><p>{item.summary}</p></div><div className={`grade grade-${item.grade}`}>{item.grade}</div></div><div className="score-bar"><span style={{width:`${item.score}%`}}></span></div><div className="score-metrics">{type==='client'?<><span>Aprovação <b>{item.approval_rate}%</b></span><span>Versões médias <b>{item.average_versions}</b></span></>:<><span>No prazo <b>{item.on_time_rate}%</b></span><span>Pedidos ativos <b>{item.active_requests}</b></span></>}</div></div></article>
  return <div className="content-page"><div className="page-heading"><div><h1>Clientes e fornecedores</h1><p>Classificação calculada automaticamente pelo histórico real.</p></div></div><div className="two-columns"><section><h2>Clientes</h2><div className="score-list">{clients.map(item=><Card key={item.name} item={item} type="client"/>)}</div></section><section><h2>Fornecedores</h2><div className="score-list">{suppliers.map(item=><Card key={item.name} item={item} type="supplier"/>)}</div></section></div></div>
}
