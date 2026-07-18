import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Link2, Search, Shirt, Scroll } from 'lucide-react'
import { api } from '../api/client'
import { toast } from '../lib/toast'
import type { Development, FabricRequest, Production } from '../types'

type ProductionResponse = { stages: string[]; items: Production[] }
type FabricResponse = { statuses: string[]; items: FabricRequest[] }
type ReviewKind = 'production' | 'fabric'

const CODE_PATTERN = /\b[A-Z]{1,3}\s*[_:]\s*B\d{3}\s*_\s*\d{2,3}(?:\s*_\s*V\d+)?\b/gi

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function codes(value: string) {
  return [...value.matchAll(CODE_PATTERN)].map(match => match[0].toUpperCase().replace(':', '_').replace(/\s/g, ''))
}

function candidateScore(text: string, clientName: string | undefined, development: Development) {
  if (codes(text).includes(development.code.toUpperCase().replace(/\s/g, ''))) return 100
  let score = clientName && normalize(clientName) === normalize(development.client_name) ? 20 : 0
  const sourceTokens = new Set(normalize(text).split(' ').filter(token => token.length > 3))
  const targetTokens = normalize(`${development.code} ${development.title}`).split(' ').filter(token => token.length > 3)
  score += targetTokens.filter(token => sourceTokens.has(token)).length * 8
  return score
}

export function ReconciliationPage() {
  const [developments, setDevelopments] = useState<Development[]>([])
  const [productions, setProductions] = useState<Production[]>([])
  const [fabrics, setFabrics] = useState<FabricRequest[]>([])
  const [kind, setKind] = useState<ReviewKind>('production')
  const [query, setQuery] = useState('')
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    Promise.all([
      api.get<Development[]>('/developments'),
      api.get<ProductionResponse>('/productions'),
      api.get<FabricResponse>('/fabric-requests'),
    ]).then(([devs, productionData, fabricData]) => {
      setDevelopments(devs)
      setProductions(productionData.items.filter(item => !item.development_id))
      setFabrics(fabricData.items.filter(item => !item.development_id))
    })
  }, [])

  const items = useMemo(() => {
    const needle = normalize(query)
    const source = kind === 'production' ? productions : fabrics
    if (!needle) return source
    return source.filter(item => normalize(kind === 'production'
      ? `${(item as Production).title || ''} ${(item as Production).client_name}`
      : `${(item as FabricRequest).reference} ${(item as FabricRequest).notes || ''}`,
    ).includes(needle))
  }, [kind, productions, fabrics, query])

  function suggestions(text: string, clientName?: string) {
    return developments.map(development => ({ development, score: candidateScore(text, clientName, development) }))
      .filter(candidate => candidate.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
  }

  function selectionKey(itemKind: ReviewKind, id: number) { return `${itemKind}:${id}` }

  async function confirm(itemKind: ReviewKind, id: number) {
    const key = selectionKey(itemKind, id)
    const developmentId = Number(selections[key])
    if (!developmentId) return
    setSaving(key)
    try {
      if (itemKind === 'production') {
        await api.patch(`/productions/${id}`, { development_id: developmentId })
        setProductions(current => current.filter(item => item.id !== id))
      } else {
        await api.patch(`/fabric-requests/${id}`, { development_id: developmentId })
        setFabrics(current => current.filter(item => item.id !== id))
      }
      setSelections(current => { const next = { ...current }; delete next[key]; return next })
      toast('success', itemKind === 'production' ? 'Produção ligada ao desenvolvimento.' : 'Malha ligada ao desenvolvimento.')
    } finally { setSaving(null) }
  }

  return <div className="content-page reconciliation-page">
    <div className="page-heading">
      <div><h1>Revisão de ligações</h1><p>Confirme a origem das produções e as malhas usadas. Nenhuma sugestão é aplicada sem confirmação.</p></div>
      <div className="review-total"><Link2 size={18}/><strong>{productions.length + fabrics.length}</strong><span>por rever</span></div>
    </div>
    <div className="phase-tabs">
      <button className={kind === 'production' ? 'active' : ''} onClick={() => { setKind('production'); setLimit(50) }}><Shirt size={15}/>Produções <span>{productions.length}</span></button>
      <button className={kind === 'fabric' ? 'active' : ''} onClick={() => { setKind('fabric'); setLimit(50) }}><Scroll size={15}/>Malhas <span>{fabrics.length}</span></button>
    </div>
    <div className="filter-bar"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Pesquisar referência, cliente ou código..."/></div>
    <div className="review-list">
      {items.length === 0 && <div className="review-empty"><CheckCircle2 size={34}/><strong>Tudo revisto</strong><span>Não existem registos sem desenvolvimento nesta vista.</span></div>}
      {items.slice(0, limit).map(rawItem => {
        const isProduction = kind === 'production'
        const production = rawItem as Production
        const fabric = rawItem as FabricRequest
        const title = isProduction ? production.title || `Produção #${production.id}` : fabric.reference
        const context = isProduction ? production.client_name : [fabric.article, fabric.color, fabric.supplier_name].filter(Boolean).join(' · ')
        const sourceText = isProduction ? `${production.title || ''}\n${production.description || ''}` : `${fabric.reference}\n${fabric.notes || ''}`
        const candidates = suggestions(sourceText, isProduction ? production.client_name : undefined)
        const key = selectionKey(kind, rawItem.id)
        const strongest = candidates[0]
        return <article className="review-row" key={key}>
          <div className="review-source"><small>{isProduction ? 'PRODUÇÃO' : 'MALHA'}</small><strong>{title}</strong><span>{context || 'Sem informação adicional'}</span></div>
          <div className="review-suggestions"><small>SUGESTÕES</small>
            {candidates.length === 0 && <span className="review-no-match">Sem correspondência automática</span>}
            {candidates.map(candidate => <button type="button" key={candidate.development.id} className={selections[key] === String(candidate.development.id) ? 'selected' : ''} onClick={() => setSelections(current => ({ ...current, [key]: String(candidate.development.id) }))}>
              {candidate.development.code} · {candidate.development.title}{candidate.score === 100 && <em>Código encontrado</em>}
            </button>)}
          </div>
          <div className="review-confirm">
            <select aria-label={`Desenvolvimento de origem para ${title}`} value={selections[key] || ''} onChange={event => setSelections(current => ({ ...current, [key]: event.target.value }))}>
              <option value="">Selecionar desenvolvimento...</option>
              {developments.map(development => <option key={development.id} value={development.id}>{development.code} — {development.title} · {development.client_name}</option>)}
            </select>
            {strongest?.score === 100 && !selections[key] && <button type="button" className="use-suggestion" onClick={() => setSelections(current => ({ ...current, [key]: String(strongest.development.id) }))}>Usar código encontrado</button>}
            <button type="button" className="primary-button" disabled={!selections[key] || saving === key} onClick={() => void confirm(kind, rawItem.id)}>{saving === key ? 'A ligar...' : 'Confirmar ligação'}</button>
          </div>
        </article>
      })}
      {items.length > limit && <button className="clear-filters" onClick={() => setLimit(current => current + 100)}>Mostrar mais {items.length - limit}...</button>}
    </div>
  </div>
}
