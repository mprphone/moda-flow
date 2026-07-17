from enum import StrEnum


class Stage(StrEnum):
    NOVO = "novo"
    PROPOSTA_CLIENTE = "proposta_cliente"
    FICHA_TECNICA = "ficha_tecnica"
    DESENVOLVIMENTO_MALHA = "desenvolvimento_malha"
    TINGIMENTO = "tingimento"
    MODELAGEM = "modelagem"
    CORTE = "corte"
    CONFECAO = "confecao"
    ACESSORIOS = "acessorios"
    ENVIO_CLIENTE = "envio_cliente"
    APROVADO = "aprovado"


PIPELINE = [stage.value for stage in Stage]

# Fase 1: proposta/desenho (o cliente ainda não aprovou — muitos morrem aqui).
# Fase 2: amostra física (só depois de o cliente aprovar o desenho).
PHASE_ONE = [Stage.NOVO.value, Stage.PROPOSTA_CLIENTE.value]
PHASE_TWO = [stage for stage in PIPELINE if stage not in PHASE_ONE]

STAGE_LABELS = {
    Stage.NOVO.value: "Desenho",
    Stage.PROPOSTA_CLIENTE.value: "Proposta cliente",
    Stage.FICHA_TECNICA.value: "Ficha técnica",
    Stage.DESENVOLVIMENTO_MALHA.value: "Desenv. malha",
    Stage.TINGIMENTO.value: "Tingimento",
    Stage.MODELAGEM.value: "Modelagem",
    Stage.CORTE.value: "Corte",
    Stage.CONFECAO.value: "Confeção",
    Stage.ACESSORIOS.value: "Acessórios",
    Stage.ENVIO_CLIENTE.value: "Envio cliente",
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
