from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.ip_blocks import IPBlockCreate, IPBlockListResponse, IPBlockResponse, IPBlockUnblockResponse, SelfBlockCheckResponse
from app.services.ip_block_service import IPBlockService, get_client_ip

router = APIRouter()


@router.get("/check-self", response_model=SelfBlockCheckResponse)
def check_self(request: Request, db: Annotated[Session, Depends(get_db)]) -> SelfBlockCheckResponse:
    ip_address = get_client_ip(request)
    try:
        block = IPBlockService.get_active_block(db, ip_address)
    except SQLAlchemyError:
        db.rollback()
        return SelfBlockCheckResponse(blocked=False, ip_address=ip_address)
    if block is None:
        return SelfBlockCheckResponse(blocked=False, ip_address=ip_address)
    return SelfBlockCheckResponse(
        blocked=True,
        ip_address=block.ip_address,
        reason=block.reason,
        blocked_until=block.blocked_until,
        is_permanent=block.blocked_until is None,
    )


@router.get("", response_model=IPBlockListResponse)
def list_ip_blocks(
    db: Annotated[Session, Depends(get_db)],
    current_admin: Annotated[User, Depends(require_admin)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    active_only: bool | None = None,
) -> IPBlockListResponse:
    total, items = IPBlockService.list_blocks(db=db, skip=skip, limit=limit, active_only=active_only)
    return IPBlockListResponse(total=total, skip=skip, limit=limit, items=[IPBlockResponse.model_validate(item) for item in items])


@router.post("", response_model=IPBlockResponse, status_code=201)
def create_ip_block(payload: IPBlockCreate, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]) -> IPBlockResponse:
    block = IPBlockService.create_block(
        db=db,
        ip_address=payload.ip_address,
        reason=payload.reason,
        blocked_until=payload.blocked_until,
        actor_user_id=current_admin.id,
    )
    return IPBlockResponse.model_validate(block)


@router.patch("/{block_id}/unblock", response_model=IPBlockUnblockResponse)
def unblock_ip(block_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]) -> IPBlockUnblockResponse:
    block = IPBlockService.unblock(db=db, block_id=block_id, actor_user_id=current_admin.id)
    return IPBlockUnblockResponse(message="IP block removed successfully.", block=IPBlockResponse.model_validate(block))


@router.delete("/{block_id}", response_model=IPBlockUnblockResponse)
def delete_ip_block(block_id: int, db: Annotated[Session, Depends(get_db)], current_admin: Annotated[User, Depends(require_admin)]) -> IPBlockUnblockResponse:
    block = IPBlockService.unblock(db=db, block_id=block_id, actor_user_id=current_admin.id)
    return IPBlockUnblockResponse(message="IP block removed successfully.", block=IPBlockResponse.model_validate(block))
