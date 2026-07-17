from app.core.enums import DevelopmentStatus, Stage
from app.core.timeutil import today
from app.models.development import Development
from app.services.pipeline.timing import days_in_current_stage


def build_suggestions(development: Development) -> list[str]:
    suggestions: list[str] = []
    days = days_in_current_stage(development)

    if days >= 7 and development.status == DevelopmentStatus.ACTIVE.value:
        suggestions.append(f"Está há {days:.0f} dias nesta fase. Confirmar se existe bloqueio.")
    if development.status == DevelopmentStatus.WAITING_SUPPLIER.value and days >= 3:
        suggestions.append("Enviar lembrete ao fornecedor.")
    if development.status == DevelopmentStatus.WAITING_CLIENT.value and days >= 4:
        suggestions.append("Pedir decisão ao cliente e definir nova data de resposta.")
    if development.due_date:
        remaining = (development.due_date - today()).days
        if remaining < 0:
            suggestions.append(f"Prazo ultrapassado há {abs(remaining)} dias.")
        elif remaining <= 3 and development.current_stage not in {Stage.ENVIO_CLIENTE.value, Stage.APROVADO.value}:
            suggestions.append("Prazo em risco. Reorganizar prioridades hoje.")
    if development.current_stage == Stage.APROVADO.value and not development.productions:
        suggestions.append("Amostra aprovada. Criar produção com os dados já existentes.")
    return suggestions[:3]


def risk_from_suggestions(suggestions: list[str]) -> str:
    text = " ".join(suggestions).lower()
    if "ultrapassado" in text or "risco" in text:
        return "high"
    if suggestions:
        return "medium"
    return "low"


def risk_level(development: Development) -> str:
    return risk_from_suggestions(build_suggestions(development))
