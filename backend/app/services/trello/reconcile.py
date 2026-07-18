import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.development import Development
from app.models.fabric_request import FabricRequest
from app.models.production import Production


CODE_PATTERN = re.compile(r"\b([A-Z]{1,3})\s*[_:]\s*(B\d{3})\s*_\s*(\d{2,3})(?:\s*_\s*(V\d+))?\b", re.IGNORECASE)


def normalize_code(value: str) -> str:
    match = CODE_PATTERN.search(value or "")
    if not match:
        return ""
    return "_".join(part.upper() for part in match.groups() if part)


def extract_codes(value: str) -> set[str]:
    return {"_".join(part.upper() for part in match.groups() if part) for match in CODE_PATTERN.finditer(value or "")}


def normalize_text(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    return " ".join(re.sub(r"[^a-zA-Z0-9]+", " ", plain).lower().split())


@dataclass
class TrelloCard:
    name: str
    desc: str = ""

    @property
    def text(self) -> str:
        return f"{self.name}\n{self.desc}"


@dataclass
class ReconcileReport:
    productions_linked: int = 0
    fabrics_linked: int = 0
    productions_unmatched: int = 0
    fabrics_unmatched: int = 0
    ambiguous: int = 0


def unique_name_index(cards: Iterable[TrelloCard]) -> dict[str, TrelloCard]:
    grouped: dict[str, list[TrelloCard]] = defaultdict(list)
    for card in cards:
        grouped[normalize_text(card.name)].append(card)
    return {name: items[0] for name, items in grouped.items() if name and len(items) == 1}


def development_for_text(text: str, developments: dict[str, Development]) -> tuple[Development | None, bool]:
    matches = {developments[code].id: developments[code] for code in extract_codes(text) if code in developments}
    if len(matches) == 1:
        return next(iter(matches.values())), False
    return None, len(matches) > 1


def reconcile_links(
    db: Session,
    production_cards: Iterable[TrelloCard],
    fabric_cards: Iterable[TrelloCard],
    *,
    apply: bool = False,
) -> ReconcileReport:
    report = ReconcileReport()
    developments = {
        normalize_code(item.code): item
        for item in db.scalars(select(Development)).all()
        if normalize_code(item.code)
    }
    production_index = unique_name_index(production_cards)
    fabric_index = unique_name_index(fabric_cards)

    for production in db.scalars(select(Production).where(Production.development_id.is_(None))).all():
        text = f"{production.title or ''}\n{production.description or ''}"
        card = production_index.get(normalize_text(production.title or ""))
        if card:
            text += f"\n{card.text}"
        development, ambiguous = development_for_text(text, developments)
        if development:
            report.productions_linked += 1
            if apply:
                production.development_id = development.id
        elif ambiguous:
            report.ambiguous += 1
        else:
            report.productions_unmatched += 1

    for fabric in db.scalars(select(FabricRequest).where(FabricRequest.development_id.is_(None))).all():
        text = f"{fabric.reference}\n{fabric.notes or ''}"
        card = fabric_index.get(normalize_text(fabric.reference))
        if card:
            text += f"\n{card.text}"
        development, ambiguous = development_for_text(text, developments)
        if development:
            report.fabrics_linked += 1
            if apply:
                fabric.development_id = development.id
        elif ambiguous:
            report.ambiguous += 1
        else:
            report.fabrics_unmatched += 1

    if apply:
        db.commit()
    else:
        db.rollback()
    return report
