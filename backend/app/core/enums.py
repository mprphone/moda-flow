from enum import StrEnum


class Stage(StrEnum):
    # Os dois valores iniciais são mantidos por compatibilidade com os dados existentes.
    NOVO = "novo"
    PROPOSTA_CLIENTE = "proposta_cliente"
    FICHA_TECNICA = "ficha_tecnica"
    DESENVOLVIMENTO_MALHA = "desenvolvimento_malha"
    MODELAGEM = "modelagem"
    CORTE = "corte"
    CONFECAO = "confecao"
    FINALIZACAO = "finalizacao"
    ENVIO_CLIENTE = "envio_cliente"
    RESPOSTA_CLIENTE = "resposta_cliente"
    RETIFICACOES = "retificacoes"
    APROVADO = "aprovado"


PIPELINE = [stage.value for stage in Stage]
PHASE_ONE = [Stage.NOVO.value, Stage.PROPOSTA_CLIENTE.value]
PHASE_TWO = [stage for stage in PIPELINE if stage not in PHASE_ONE]

STAGE_LABELS = {
    Stage.NOVO.value: "Pedido recebido",
    Stage.PROPOSTA_CLIENTE.value: "Referências e distribuição",
    Stage.FICHA_TECNICA.value: "Ficha técnica",
    Stage.DESENVOLVIMENTO_MALHA.value: "Preparação materiais",
    Stage.MODELAGEM.value: "Modelagem",
    Stage.CORTE.value: "Corte",
    Stage.CONFECAO.value: "Confeção",
    Stage.FINALIZACAO.value: "Finalização da amostra",
    Stage.ENVIO_CLIENTE.value: "Envio cliente",
    Stage.RESPOSTA_CLIENTE.value: "Resposta cliente",
    Stage.RETIFICACOES.value: "Retificações",
    Stage.APROVADO.value: "Aprovado",
}


class DevelopmentStatus(StrEnum):
    ACTIVE = "active"
    WAITING_SUPPLIER = "waiting_supplier"
    WAITING_CLIENT = "waiting_client"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class ShoppingStatus(StrEnum):
    IN_USE = "in_use"
    TO_RETURN = "to_return"
    RETURNED = "returned"
    CREDIT_NOTE_PENDING = "credit_note_pending"
    REFUND_PENDING = "refund_pending"
    CLOSED = "closed"
