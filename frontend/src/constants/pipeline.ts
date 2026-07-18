export const PIPELINE = [
  ['novo', 'Pedido recebido'],
  ['proposta_cliente', 'Referências e distribuição'],
  ['ficha_tecnica', 'Ficha técnica'],
  ['desenvolvimento_malha', 'Preparação materiais'],
  ['modelagem', 'Modelagem'],
  ['corte', 'Corte'],
  ['confecao', 'Confeção'],
  ['finalizacao', 'Finalização da amostra'],
  ['envio_cliente', 'Envio cliente'],
  ['resposta_cliente', 'Resposta cliente'],
  ['retificacoes', 'Retificações'],
  ['aprovado', 'Aprovado'],
] as const

export const STAGE_LABELS = Object.fromEntries(PIPELINE)
export const PHASE_ONE_IDS = ['novo', 'proposta_cliente'] as const
export const PHASE_ONE = PIPELINE.filter(([id]) => (PHASE_ONE_IDS as readonly string[]).includes(id))
export const PHASE_TWO = PIPELINE.filter(([id]) => !(PHASE_ONE_IDS as readonly string[]).includes(id))
