from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.domain_spoofing import DomainSpoofingRequest, DomainSpoofingResponse
from app.services.domain_spoofing_service import run_domain_spoofing_check

router = APIRouter()


@router.post("/check", response_model=DomainSpoofingResponse)
async def check_domain_spoofing(request: DomainSpoofingRequest) -> DomainSpoofingResponse:
    if not request.authorized:
        raise HTTPException(
            status_code=400,
            detail="Please confirm you own this brand/domain or have permission to monitor impersonation risks.",
        )
    try:
        result = await run_domain_spoofing_check(request.domain, max_variants=request.max_variants)
        return DomainSpoofingResponse.model_validate(result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to complete action. Please try again.")
