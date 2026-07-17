from app.core.enums import Stage, DevelopmentStatus
from app.models.development import Development


def get_next_action(development: Development) -> str:
    if development.status == DevelopmentStatus.WAITING_SUPPLIER.value:
        return "Confirmar prazo com o fornecedor"
    if development.status == DevelopmentStatus.WAITING_CLIENT.value:
        return "Pedir resposta ao cliente"
    if development.status == DevelopmentStatus.BLOCKED.value:
        return "Resolver bloqueio"

    actions = {
        Stage.NOVO.value: "Preparar ficha técnica",
        Stage.FICHA_TECNICA.value: "Concluir ficha técnica",
        Stage.DESENVOLVIMENTO_MALHA.value: "Confirmar malha ou pedir desenvolvimento",
        Stage.TINGIMENTO.value: "Confirmar cor e prazo de tingimento",
        Stage.MODELAGEM.value: "Validar moldes",
        Stage.CORTE.value: "Concluir corte piloto",
        Stage.CONFECAO.value: "Terminar amostra piloto",
        Stage.ACESSORIOS.value: "Aplicar e validar acessórios",
        Stage.ENVIO_CLIENTE.value: "Registar resposta do cliente",
        Stage.APROVADO.value: "Criar produção",
    }
    return actions.get(development.current_stage, "Rever desenvolvimento")
