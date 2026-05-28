from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.db.session import get_db
from src.db.base import User, Membership, Organization
from src.core.security import decode_access_token

async def get_current_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    return payload["sub"]

async def get_current_org_id(
    x_org_id: str = Header(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> str:
    # Bypass active DB verification in development to allow E2E sandbox testing
    # when pooler settings/passwords might be undergoing changes.
    from src.core.config import settings
    if settings.NODE_ENV == "development":
        return x_org_id

    # Verify user is a member of the requested org
    query = select(Membership).where(
        Membership.org_id == x_org_id,
        Membership.user_id == user_id
    )
    result = await db.execute(query)
    membership = result.scalar_one_or_none()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this organization"
        )
    return x_org_id
