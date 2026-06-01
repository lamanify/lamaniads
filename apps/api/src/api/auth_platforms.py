from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from src.db.session import get_db
from src.db.base import PlatformConnection
from src.core.config import settings
from src.core.vault import encrypt_token
from src.api.deps import get_current_org_id

router = APIRouter(prefix="/platforms", tags=["platforms"])

META_OAUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth"
META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token"

GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

@router.get("/connect/meta")
async def connect_meta_url(
    org_id: str = Depends(get_current_org_id)
):
    redirect_uri = f"{settings.APP_URL}/api/platforms/callback/meta"
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": redirect_uri,
        "scope": "ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic",
        "response_type": "code",
        "state": org_id
    }
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return {"url": f"{META_OAUTH_URL}?{query_string}"}

@router.get("/callback/meta")
async def callback_meta(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        response = await client.get(META_TOKEN_URL, params={
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_CLIENT_SECRET,
            "redirect_uri": f"{settings.APP_URL}/api/platforms/callback/meta",
            "code": code
        })
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Meta code")
        
        data = response.json()
        access_token = data.get("access_token")
        
        encrypted_token = encrypt_token(access_token)
        
        connection = PlatformConnection(
            org_id=state,
            platform="meta",
            access_token_encrypted=encrypted_token,
            status="active"
        )
        db.add(connection)
        await db.commit()
        
        return {"status": "success", "platform": "meta"}

@router.get("/connect/google")
async def connect_google_url(
    org_id: str = Depends(get_current_org_id)
):
    redirect_uri = f"{settings.APP_URL}/api/platforms/callback/google"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "https://www.googleapis.com/auth/adwords",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": org_id
    }
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    return {"url": f"{GOOGLE_OAUTH_URL}?{query_string}"}

@router.get("/callback/google")
async def callback_google(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    async with httpx.AsyncClient() as client:
        response = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{settings.APP_URL}/api/platforms/callback/google",
            "grant_type": "authorization_code",
            "code": code
        })
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code")
            
        data = response.json()
        access_token = data.get("access_token")
        refresh_token = data.get("refresh_token")
        
        encrypted_access = encrypt_token(access_token)
        encrypted_refresh = encrypt_token(refresh_token) if refresh_token else None
        
        connection = PlatformConnection(
            org_id=state,
            platform="google",
            access_token_encrypted=encrypted_access,
            refresh_token_encrypted=encrypted_refresh,
            status="active"
        )
        db.add(connection)
        await db.commit()
        
        return {"status": "success", "platform": "google"}
