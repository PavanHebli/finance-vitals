from fastapi import APIRouter, Header, HTTPException
from models import AccountDeleteResponse
from core.account import delete_account
from config import get_config

router = APIRouter()


@router.delete("/account", response_model=AccountDeleteResponse)
def delete_own_account(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    access_token = authorization.removeprefix("Bearer ").strip()
    cfg = get_config()

    if not cfg.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Account deletion is not configured on this server")

    success = delete_account(
        access_token=access_token,
        supabase_url=cfg.supabase_url,
        anon_key=cfg.supabase_key,
        service_role_key=cfg.supabase_service_role_key,
    )
    if not success:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return AccountDeleteResponse(success=True)
