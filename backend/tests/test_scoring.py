from types import SimpleNamespace
from app.services.scoring.client_score import calculate_client_score


def test_empty_client_score():
    client = SimpleNamespace(id=1, name="Teste", developments=[])
    result = calculate_client_score(None, client)
    assert result["score"] >= 0
    assert result["grade"] in {"A", "B", "C", "D"}
