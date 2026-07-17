from fastapi import APIRouter, Depends
from app.api.routes import auth, health, developments, clients, suppliers, dashboard, shopping, productions, labels, stats, users
from app.core.security import get_current_user

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

protected = APIRouter(dependencies=[Depends(get_current_user)])
protected.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
protected.include_router(developments.router, prefix="/developments", tags=["developments"])
protected.include_router(clients.router, prefix="/clients", tags=["clients"])
protected.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
protected.include_router(shopping.router, prefix="/shopping", tags=["shopping"])
protected.include_router(productions.router, prefix="/productions", tags=["productions"])
protected.include_router(labels.router, prefix="/labels", tags=["labels"])
protected.include_router(stats.router, prefix="/stats", tags=["stats"])
protected.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(protected)
