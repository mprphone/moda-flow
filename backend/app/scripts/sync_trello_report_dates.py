"""Reconcilia as datas históricas dos relatórios com os cartões Trello.

Por omissão apenas simula. Com ``--apply``, envia uma correspondência validada
para a API da Moda Flow. As credenciais Trello nunca saem deste computador.
"""
from __future__ import annotations

import argparse
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path

import httpx


DATE_PATTERN = re.compile(
    r"(?<!\d)(20\d{2})[./-](0?[1-9]|1[0-2])[./-]([0-2]?\d|3[01])(?!\d)"
    r"|(?<!\d)([0-2]?\d|3[01])[./-](0?[1-9]|1[0-2])[./-](20\d{2})(?!\d)"
)


@dataclass(frozen=True)
class Match:
    entity: str
    record_id: int
    card: dict
    source_created_at: datetime | None = None
    source_date: date | None = None

    def payload(self) -> dict:
        return {
            "entity": self.entity,
            "record_id": self.record_id,
            "trello_card_id": self.card["id"],
            "source_created_at": self.source_created_at.isoformat() if self.source_created_at else None,
            "source_date": self.source_date.isoformat() if self.source_date else None,
        }


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8-sig").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize(value: str | None) -> str:
    plain = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-zA-Z0-9]+", " ", plain).lower().split())


def card_created_at(card: dict) -> datetime:
    # Os primeiros 8 caracteres do ID do cartão são o timestamp de criação.
    value = datetime.fromtimestamp(int(card["id"][:8], 16), tz=timezone.utc)
    return value.replace(tzinfo=None, microsecond=0)


def dates_in(text: str | None) -> list[date]:
    values: list[date] = []
    for match in DATE_PATTERN.finditer(text or ""):
        try:
            if match.group(1):
                year, month, day = map(int, match.group(1, 2, 3))
            else:
                day, month, year = map(int, match.group(4, 5, 6))
            values.append(date(year, month, day))
        except ValueError:
            continue
    return values


def business_date(card: dict, keywords: tuple[str, ...]) -> date:
    for line in (card.get("desc") or "").splitlines():
        normalized = normalize(line)
        if any(keyword in normalized for keyword in keywords):
            values = dates_in(line)
            if values:
                return values[0]
    return card_created_at(card).date()


def unique_index(cards: list[dict]) -> dict[str, dict]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for card in cards:
        grouped[normalize(card["name"])].append(card)
    return {name: items[0] for name, items in grouped.items() if name and len(items) == 1}


def find_board(boards: list[dict], prefix: str) -> dict:
    exact = [board for board in boards if normalize(board["name"]) == prefix]
    matches = exact or [board for board in boards if normalize(board["name"]).startswith(prefix)]
    if len(matches) != 1:
        raise RuntimeError(f'Não foi possível identificar um único quadro com o prefixo "{prefix}".')
    return matches[0]


def fetch_trello(client: httpx.Client, key: str, token: str) -> dict[str, list[dict]]:
    auth = {"key": key, "token": token}
    boards = client.get(
        "https://api.trello.com/1/members/me/boards",
        params={**auth, "fields": "id,name", "filter": "open"},
    ).raise_for_status().json()
    board_prefixes = {
        "development": "desenvolvimento modelos",
        "production": "producoes",
        "fabric": "pedido malhas",
        "shopping": "shopping",
    }
    result: dict[str, list[dict]] = {}
    for entity, prefix in board_prefixes.items():
        board = find_board(boards, prefix)
        result[entity] = client.get(
            f"https://api.trello.com/1/boards/{board['id']}/cards",
            params={**auth, "fields": "id,name,desc,dateLastActivity", "filter": "all"},
        ).raise_for_status().json()
    return result


def fetch_app(client: httpx.Client, api_url: str, email: str, password: str) -> tuple[dict[str, list[dict]], dict[str, str]]:
    login = client.post(f"{api_url}/auth/login", json={"email": email, "password": password}).raise_for_status().json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    result = {
        "development": client.get(f"{api_url}/developments", headers=headers).raise_for_status().json(),
        "production": client.get(f"{api_url}/productions", headers=headers).raise_for_status().json()["items"],
        "fabric": client.get(f"{api_url}/fabric-requests", headers=headers).raise_for_status().json()["items"],
        "shopping": client.get(f"{api_url}/shopping", headers=headers).raise_for_status().json(),
    }
    return result, headers


def reconcile(app: dict[str, list[dict]], cards: dict[str, list[dict]]) -> tuple[list[Match], dict[str, int]]:
    matches: list[Match] = []
    unmatched: dict[str, int] = {}

    # Desenvolvimento: o código é estável e pode surgir antes ou depois do título.
    dev_found = 0
    dev_name_index = unique_index(cards["development"])
    for item in app["development"]:
        code = normalize(item.get("code"))
        candidates = [
            card for card in cards["development"]
            if code and (normalize(card["name"]) == code or normalize(card["name"]).startswith(code + " "))
        ]
        if len(candidates) != 1:
            candidates = [card for card in cards["development"] if code and code in normalize(card["name"])]
        card = candidates[0] if len(candidates) == 1 else dev_name_index.get(normalize(item.get("title")))
        if card:
            matches.append(Match("development", item["id"], card, source_created_at=card_created_at(card)))
            dev_found += 1
    unmatched["development"] = len(app["development"]) - dev_found

    for entity, app_field in (("production", "title"), ("fabric", "reference")):
        index = unique_index(cards[entity])
        found = 0
        for item in app[entity]:
            card = index.get(normalize(item.get(app_field)))
            if not card:
                continue
            if entity == "production":
                matches.append(Match(entity, item["id"], card, source_created_at=card_created_at(card)))
            else:
                matches.append(Match(entity, item["id"], card, source_date=business_date(card, ("pedido", "encomend"))))
            found += 1
        unmatched[entity] = len(app[entity]) - found

    shopping_found = 0
    for item in app["shopping"]:
        reference = normalize(item.get("reference"))
        candidates = [card for card in cards["shopping"] if reference and reference in normalize(card["name"])]
        if len(candidates) == 1:
            card = candidates[0]
            matches.append(Match("shopping", item["id"], card, source_date=business_date(card, ("compra", "comprado"))))
            shopping_found += 1
    unmatched["shopping"] = len(app["shopping"]) - shopping_found
    return matches, unmatched


def main() -> None:
    parser = argparse.ArgumentParser(description="Reconcilia as datas dos relatórios com os cartões Trello.")
    parser.add_argument("--api-url", required=True, help="URL da API, incluindo /api.")
    parser.add_argument("--email", required=True, help="Conta administradora da Moda Flow.")
    parser.add_argument("--apply", action="store_true", help="Aplica as datas; sem esta opção apenas simula.")
    parser.add_argument("--trello-env", default=".env.trello.local")
    parser.add_argument("--app-env", default=".env")
    args = parser.parse_args()

    trello_env = load_env(Path(args.trello_env))
    app_env = load_env(Path(args.app_env))
    key = trello_env.get("TRELLO_API_KEY")
    token = trello_env.get("TRELLO_TOKEN")
    password = app_env.get("SEED_USER_PASSWORD")
    if not key or not token or not password:
        raise SystemExit("Faltam TRELLO_API_KEY, TRELLO_TOKEN ou SEED_USER_PASSWORD nos ficheiros env.")

    api_url = args.api_url.rstrip("/")
    with httpx.Client(timeout=90) as client:
        cards = fetch_trello(client, key, token)
        app, headers = fetch_app(client, api_url, args.email, password)
        matches, unmatched = reconcile(app, cards)
        counts = {entity: sum(match.entity == entity for match in matches) for entity in app}
        print("Correspondências seguras:", counts)
        print("Por rever (sem alteração):", unmatched)
        if not args.apply:
            print("SIMULAÇÃO: nenhuma data foi alterada.")
            return
        response = client.post(
            f"{api_url}/reports/trello-source-dates",
            headers=headers,
            json={"items": [match.payload() for match in matches]},
        ).raise_for_status().json()
        print("APLICADO:", response)


if __name__ == "__main__":
    main()
