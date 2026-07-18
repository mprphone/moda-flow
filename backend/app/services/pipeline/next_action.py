from app.core.enums import Stage, DevelopmentStatus
from app.models.development import Development


def get_next_action(development: Development) -> str:
    if development.status == DevelopmentStatus.WAITING_SUPPLIER.value:
        return "Confirmar prazo com o fornecedor"
    if development.status == DevelopmentStatus.WAITING_CLIENT.value:
        return "Pedir resposta ao cliente"
    if development.status == DevelopmentStatus.BLOCKED.value:
        return "Resolver bloqueio"
    tasks = getattr(development, "tasks", [])
    waiting_task = next((task for task in tasks if task.status == "waiting"), None)
    if waiting_task:
        return f"Resolver pendência: {waiting_task.kind.replace('_', ' ')}"
    active_task = next((task for task in tasks if task.status in {"pending", "in_progress"}), None)
    if active_task:
        return f"Tratar pendência: {active_task.kind.replace('_', ' ')}"
    actions = {
        Stage.NOVO.value: "Registar pedido, fotografias e referências",
        Stage.PROPOSTA_CLIENTE.value: "Distribuir referências pelas designers",
        Stage.FICHA_TECNICA.value: "Concluir a ficha técnica",
        Stage.DESENVOLVIMENTO_MALHA.value: "Tratar materiais e serviços em paralelo",
        Stage.MODELAGEM.value: "Validar moldes",
        Stage.CORTE.value: "Concluir corte piloto",
        Stage.CONFECAO.value: "Terminar a confeção da amostra",
        Stage.FINALIZACAO.value: "Rever e finalizar a amostra",
        Stage.ENVIO_CLIENTE.value: "Enviar a amostra ao cliente",
        Stage.RESPOSTA_CLIENTE.value: "Registar aprovação, retificação ou reprovação",
        Stage.RETIFICACOES.value: "Executar alterações pedidas pelo cliente",
        Stage.APROVADO.value: "Criar produção industrial",
    }
    return actions.get(development.current_stage, "Rever desenvolvimento")
