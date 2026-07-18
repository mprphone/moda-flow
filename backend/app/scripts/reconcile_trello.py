import argparse
import os

import httpx

from app.core.db import SessionLocal
from app.services.trello.reconcile import TrelloCard, reconcile_links


def fetch_cards(client: httpx.Client, key: str, token: str, board_name: str) -> list[TrelloCard]:
    auth = {"key": key, "token": token}
    boards = client.get("https://api.trello.com/1/members/me/boards", params={**auth, "fields": "name,id", "filter": "open"}).raise_for_status().json()
    board = next((item for item in boards if item["name"] == board_name), None)
    if not board:
        raise RuntimeError(f'Quadro "{board_name}" não encontrado.')
    cards = client.get(
        f"https://api.trello.com/1/boards/{board['id']}/cards",
        params={**auth, "fields": "name,desc", "filter": "open"},
    ).raise_for_status().json()
    return [TrelloCard(name=item["name"], desc=item.get("desc") or "") for item in cards]


def main() -> None:
    parser = argparse.ArgumentParser(description="Liga produções e malhas ao desenvolvimento indicado nos cartões Trello.")
    parser.add_argument("--apply", action="store_true", help="Grava as correspondências; sem esta opção apenas simula.")
    args = parser.parse_args()
    key = os.getenv("TRELLO_API_KEY")
    token = os.getenv("TRELLO_TOKEN")
    if not key or not token:
        raise SystemExit("Defina TRELLO_API_KEY e TRELLO_TOKEN no ambiente.")

    with httpx.Client(timeout=45) as client:
        productions = fetch_cards(client, key, token, "PRODUÇÕES")
        fabrics = fetch_cards(client, key, token, "PEDIDO MALHAS")
    with SessionLocal() as db:
        report = reconcile_links(db, productions, fabrics, apply=args.apply)
    mode = "APLICADO" if args.apply else "SIMULAÇÃO"
    print(f"{mode}: produções ligadas={report.productions_linked}, malhas ligadas={report.fabrics_linked}, sem correspondência={report.productions_unmatched + report.fabrics_unmatched}, ambíguas={report.ambiguous}")


if __name__ == "__main__":
    main()
