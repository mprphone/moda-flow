export const PIPELINE = [
  ['novo', 'Desenho'],
  ['proposta_cliente', 'Proposta cliente'],
  ['ficha_tecnica', 'Ficha técnica'],
  ['desenvolvimento_malha', 'Desenv. malha'],
  ['tingimento', 'Tingimento'],
  ['modelagem', 'Modelagem'],
  ['corte', 'Corte'],
  ['confecao', 'Confeção'],
  ['acessorios', 'Acessórios'],
  ['envio_cliente', 'Envio cliente'],
  ['aprovado', 'Aprovado'],
] as const

export const STAGE_LABELS = Object.fromEntries(PIPELINE)

// Fase 1: proposta/desenho (antes do OK do cliente). Fase 2: amostra física.
export const PHASE_ONE_IDS = ['novo', 'proposta_cliente'] as const
export const PHASE_ONE = PIPELINE.filter(([id]) => (PHASE_ONE_IDS as readonly string[]).includes(id))
export const PHASE_TWO = PIPELINE.filter(([id]) => !(PHASE_ONE_IDS as readonly string[]).includes(id))
