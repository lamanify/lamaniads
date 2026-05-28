from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from src.db.session import get_db
from src.db.base import Campaign
from src.api.deps import get_current_org_id

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.get("")
async def list_campaigns(
    org_id: str = Depends(get_current_org_id),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    query = select(Campaign).where(Campaign.org_id == org_id)
    
    if platform:
        query = query.where(Campaign.platform == platform)
    if status:
        query = query.where(Campaign.status == status)
        
    result = await db.execute(query)
    campaigns = result.scalars().all()
    
    return [
        {
            "id": c.id,
            "platform": c.platform,
            "platform_account_id": c.platform_account_id,
            "platform_campaign_id": c.platform_campaign_id,
            "name": c.name,
            "status": c.status,
            "budget_amount": c.budget_amount,
            "currency": c.currency,
            "last_synced_at": c.last_synced_at
        }
        for c in campaigns
    ]
