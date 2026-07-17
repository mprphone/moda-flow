export const PIPELINE = [
  ['novo', 'Novo pedido'],
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
