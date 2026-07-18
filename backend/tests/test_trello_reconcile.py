from app.models.client import Client
from app.models.development import Development
from app.models.fabric_request import FabricRequest
from app.models.production import Production
from app.services.trello.reconcile import TrelloCard, extract_codes, normalize_code, reconcile_links


def test_code_normalization_accepts_real_trello_variants():
    assert normalize_code("Isa: IF_B001_ 314") == "IF_B001_314"
    assert normalize_code("Juliana IJ:B003_007") == "IJ_B003_007"
    assert extract_codes("JF_B003_158 e BP_B001_027_V2") == {"JF_B003_158", "BP_B001_027_V2"}


def test_reconcile_links_production_and_fabric_by_explicit_code(db_session):
    client = Client(name="Brownie")
    db_session.add(client)
    db_session.flush()
    development = Development(code="IF_B003_158", title="Top modal", client_id=client.id, owner_name="Isabel")
    db_session.add(development)
    db_session.flush()
    production = Production(title="ROBIN", client_id=client.id, quantity=1000)
    fabric = FabricRequest(reference="Rolo 5938")
    db_session.add_all([production, fabric])
    db_session.commit()

    report = reconcile_links(
        db_session,
        [TrelloCard(name="ROBIN", desc="Origem: IF_B003_158")],
        [TrelloCard(name="Rolo 5938", desc="Usada no modelo IF_B003_158")],
        apply=True,
    )
    db_session.refresh(production)
    db_session.refresh(fabric)
    assert report.productions_linked == 1
    assert report.fabrics_linked == 1
    assert production.development_id == development.id
    assert fabric.development_id == development.id


def test_reconcile_does_not_guess_when_multiple_codes_match(db_session):
    client = Client(name="Pacific")
    db_session.add(client)
    db_session.flush()
    db_session.add_all([
        Development(code="IF_B001_306", title="Top", client_id=client.id, owner_name="Isa"),
        Development(code="JF_B001_228", title="Camiseta", client_id=client.id, owner_name="Joana"),
        Production(title="Produção ambígua", client_id=client.id, quantity=500, description="IF_B001_306 / JF_B001_228"),
    ])
    db_session.commit()
    report = reconcile_links(db_session, [], [], apply=True)
    assert report.ambiguous == 1
    assert db_session.query(Production).one().development_id is None
