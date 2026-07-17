from datetime import date, timedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.enums import DevelopmentStatus, Stage
from app.core.security import hash_password
from app.core.timeutil import utcnow
from app.models.client import Client
from app.models.development import Development
from app.models.label import Label
from app.models.production import Production
from app.models.shopping import ShoppingPurchase
from app.models.stage_event import StageEvent
from app.models.supplier import Supplier
from app.models.user import User

# A palavra-passe inicial vem de SEED_USER_PASSWORD (.env) e deve ser alterada após o primeiro acesso.
DEFAULT_USERS = [
    ("Isabel Fernandes", "isabel.fernandes@cunharibeiro.com"),
]

DEFAULT_LABELS = [
    ("Urgente", "pink"),
    ("Verão 2026", "yellow"),
    ("Inverno 2026", "sky"),
    ("Amostra SMS", "mint"),
    ("Reposição", "lilac"),
]


def seed_users_and_labels(db: Session):
    for name, email in DEFAULT_USERS:
        if not db.scalar(select(User).where(func.lower(User.email) == email.lower())):
            db.add(User(name=name, email=email.lower(), password_hash=hash_password(settings.seed_user_password)))
    for name, tone in DEFAULT_LABELS:
        if not db.scalar(select(Label).where(Label.name == name)):
            db.add(Label(name=name, tone=tone))
    db.commit()


DEMO_IMAGES = [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80",
]


def seed_database(db: Session):
    seed_users_and_labels(db)
    if db.scalar(select(Client.id).limit(1)):
        return

    clients = [
        Client(name="Pull&Bear", group_name="Inditex"),
        Client(name="H&M", group_name="H&M Group"),
        Client(name="Zara", group_name="Inditex"),
        Client(name="Bershka", group_name="Inditex"),
    ]
    suppliers = [
        Supplier(name="Filati Norte", category="malhas", email="pedidos@filatinorte.pt"),
        Supplier(name="Tinturaria Silva", category="tingimento", email="laboratorio@tinturariasilva.pt"),
        Supplier(name="Acessórios Ribeiro", category="acessorios", email="comercial@acessoriosribeiro.pt"),
    ]
    db.add_all(clients + suppliers)
    db.flush()

    specs = [
        ("JF_B001_277", "Pull Woman — riscas", clients[0], "Isabel Fernandes", Stage.TINGIMENTO.value, DevelopmentStatus.WAITING_SUPPLIER.value, 8, 0),
        ("IF_B002_316", "Twinset preto", clients[1], "Joana Ferreira", Stage.DESENVOLVIMENTO_MALHA.value, DevelopmentStatus.ACTIVE.value, 4, 1),
        ("JF_B008_002", "Renda turquesa", clients[1], "Isabel Fernandes", Stage.ACESSORIOS.value, DevelopmentStatus.ACTIVE.value, 2, 2),
        ("JJ_B001_033", "T-shirt gola contrastante", clients[2], "Beatriz Pinto", Stage.ENVIO_CLIENTE.value, DevelopmentStatus.WAITING_CLIENT.value, 5, 3),
        ("RJ_B003_015", "Sweat hoodie bordada", clients[3], "Carlos Santos", Stage.APROVADO.value, DevelopmentStatus.COMPLETED.value, 1, 0),
        ("BP_B002_027", "Saia terracota", clients[0], "Beatriz Pinto", Stage.MODELAGEM.value, DevelopmentStatus.BLOCKED.value, 6, 1),
    ]

    for idx, (code, title, client, owner, stage, status, days, image_idx) in enumerate(specs):
        item = Development(
            code=code,
            title=title,
            client_id=client.id,
            owner_name=owner,
            cover_url=DEMO_IMAGES[image_idx],
            current_stage=stage,
            status=status,
            waiting_reason="Aguarda confirmação de prazo" if status == DevelopmentStatus.WAITING_SUPPLIER.value else "Cliente pediu resposta" if status == DevelopmentStatus.WAITING_CLIENT.value else "Falta validar medidas" if status == DevelopmentStatus.BLOCKED.value else None,
            due_date=date.today() + timedelta(days=(idx - 2) * 3),
        )
        db.add(item)
        db.flush()
        supplier_id = suppliers[1].id if stage == Stage.TINGIMENTO.value else suppliers[0].id if stage == Stage.DESENVOLVIMENTO_MALHA.value else None
        db.add(StageEvent(
            development_id=item.id,
            stage=stage,
            status="active",
            started_at=utcnow() - timedelta(days=days),
            promised_at=utcnow() - timedelta(days=1) if status == DevelopmentStatus.WAITING_SUPPLIER.value else None,
            supplier_id=supplier_id,
            responsible_name=owner,
        ))
        if stage == Stage.APROVADO.value:
            db.add(Production(development_id=item.id, quantity=1200, due_date=date.today() + timedelta(days=45), responsible_name=owner))

    db.add_all([
        ShoppingPurchase(brand="Zara", reference="2142/098/072", amount=39.95, purchase_date=date.today()-timedelta(days=18), return_deadline=date.today()+timedelta(days=2), status="to_return", invoice_number="A95012026/000959", cover_url=DEMO_IMAGES[2]),
        ShoppingPurchase(brand="Pull&Bear", reference="3540308637", amount=29.99, purchase_date=date.today()-timedelta(days=25), return_deadline=date.today()-timedelta(days=1), status="credit_note_pending", invoice_number="20293885077", cover_url=DEMO_IMAGES[0]),
        ShoppingPurchase(brand="Bershka", reference="1176/097/040", amount=25.99, purchase_date=date.today()-timedelta(days=7), return_deadline=date.today()+timedelta(days=20), status="in_use", cover_url=DEMO_IMAGES[3]),
    ])
    db.commit()
