from fastapi import APIRouter, Depends, Query, HTTPException, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from pydantic import BaseModel
import httpx
from src.db.session import get_db
from src.db.base import Campaign, PlatformConnection, CampaignDraft, CampaignDraftAdSet, CampaignDraftAd
from src.schemas.drafts import (
    CampaignDraftCreate, CampaignDraftUpdate,
    AdSetDraftCreate, AdSetDraftUpdate,
    AdDraftCreate, AdDraftUpdate
)
from src.api.deps import get_current_org_id
from src.core.config import settings
from src.core.meta_adapter import MetaAdsAdapter
from src.core.supabase_client import supabase_rest
from src.core.vault import decrypt_token

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _get_meta_token(token_value: str) -> str:
    if not token_value:
        return ""
    if token_value.startswith("EAA"):
        return token_value
    try:
        return decrypt_token(token_value)
    except Exception:
        return token_value


async def _get_meta_adapter(org_id: str, db: AsyncSession) -> MetaAdsAdapter:
    try:
        query = (
            select(PlatformConnection)
            .where(PlatformConnection.org_id == org_id, PlatformConnection.platform == "meta", PlatformConnection.status == "active")
            .order_by(desc(PlatformConnection.created_at))
        )
        result = await db.execute(query)
        conn = result.scalars().first()
        if conn:
            token = _get_meta_token(conn.access_token_encrypted)
            if token:
                return MetaAdsAdapter(token)
    except Exception:
        pass

    if settings.NEXT_PUBLIC_SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{settings.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/platform_connections",
                    params={
                        "org_id": f"eq.{org_id}",
                        "platform": "eq.meta",
                        "status": "eq.active",
                        "order": "created_at.desc",
                        "limit": "1"
                    },
                    headers={
                        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        token = _get_meta_token(data[0].get("access_token_encrypted", ""))
                        if token:
                            return MetaAdsAdapter(token)
        except Exception:
            pass

    raise HTTPException(status_code=404, detail="No active Meta connection available")


@router.get("")
async def list_campaigns(
    org_id: str = Depends(get_current_org_id),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
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
            "last_synced_at": c.last_synced_at,
        }
        for c in campaigns
    ]


@router.get("/live/accounts")
async def live_meta_accounts(
    org_id: str = Depends(get_current_org_id),
    name_filter: Optional[str] = Query(None, description="Substring filter for account names (e.g. 'Lamanify')"),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    accounts = await adapter.list_accounts()
    if name_filter:
        accounts = [a for a in accounts if name_filter.lower() in a["name"].lower()]
    return accounts


@router.get("/live")
async def live_meta_campaigns(
    account_id: str = Query(..., description="Meta ad account id (without act_ prefix)"),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.list_campaigns(account_id)


@router.get("/live/accounts/{account_id}/campaign-insights")
async def live_meta_all_campaign_insights(
    account_id: str,
    date_preset: str = Query("last_30d"),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.get_all_campaign_insights(account_id, date_preset=date_preset)

@router.get("/live/{campaign_id}/insights")
async def live_meta_campaign_insights(
    campaign_id: str,
    account_id: str = Query(...),
    date_preset: str = Query("last_30d"),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.get_insights(account_id, campaign_id, date_preset=date_preset)


@router.get("/live/accounts/{account_id}/insights")
async def live_meta_account_insights(
    account_id: str,
    date_preset: str = Query("last_30d"),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.get_account_insights(account_id, date_preset=date_preset)


@router.get("/live/{campaign_id}/adsets")
async def live_meta_adsets(
    campaign_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.list_adsets(campaign_id)


@router.get("/live/adsets/{adset_id}/ads")
async def live_meta_ads(
    adset_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.list_ads(adset_id)


class StatusUpdateBody(BaseModel):
    status: str


@router.post("/live/{campaign_id}/status")
async def live_meta_update_status(
    campaign_id: str,
    body: StatusUpdateBody,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    if body.status.lower() not in {"active", "paused"}:
        raise HTTPException(status_code=400, detail="status must be 'active' or 'paused'")
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.update_campaign_status(campaign_id, body.status)


class BudgetUpdateBody(BaseModel):
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None


@router.post("/live/{campaign_id}/budget")
async def live_meta_update_budget(
    campaign_id: str,
    body: BudgetUpdateBody,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db),
):
    if body.daily_budget is None and body.lifetime_budget is None:
        raise HTTPException(status_code=400, detail="Provide daily_budget or lifetime_budget")
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.update_campaign_budget(
        campaign_id, daily_budget=body.daily_budget, lifetime_budget=body.lifetime_budget
    )


@router.post("/drafts")
async def create_draft(
    body: CampaignDraftCreate,
    org_id: str = Depends(get_current_org_id),
):
    return await supabase_rest.insert("campaign_drafts", {
        "org_id": org_id,
        "platform_account_id": body.platform_account_id,
        "name": body.name,
        "client_name": body.client_name,
        "internal_naming": body.internal_naming,
        "status": "draft",
        "step": 1,
        "campaign_payload": {}
    })


@router.get("/drafts")
async def list_drafts(
    org_id: str = Depends(get_current_org_id),
):
    return await supabase_rest.select("campaign_drafts", {
        "org_id": f"eq.{org_id}",
        "order": "created_at.desc"
    })


@router.get("/drafts/{draft_id}")
async def get_draft(
    draft_id: str,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}",
        "org_id": f"eq.{org_id}",
        "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    draft = drafts[0]
    adsets = await supabase_rest.select("campaign_draft_adsets", {
        "draft_id": f"eq.{draft_id}",
        "order": "position.asc"
    })

    for adset in adsets:
        adset["ads"] = await supabase_rest.select("campaign_draft_ads", {
            "adset_id": f"eq.{adset['id']}",
            "order": "position.asc"
        })

    draft["adsets"] = adsets
    return draft


@router.patch("/drafts/{draft_id}")
async def update_draft(
    draft_id: str,
    body: CampaignDraftUpdate,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    payload = body.model_dump(exclude_unset=True)
    if "campaign_payload" in payload and payload["campaign_payload"] is not None:
        payload["campaign_payload"] = body.campaign_payload.model_dump()
    return await supabase_rest.update("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}"
    }, payload)


@router.delete("/drafts/{draft_id}")
async def delete_draft(
    draft_id: str,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    await supabase_rest.delete("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}"
    })
    return {"success": True}


@router.post("/drafts/{draft_id}/adsets")
async def add_adset(
    draft_id: str,
    body: AdSetDraftCreate,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    return await supabase_rest.insert("campaign_draft_adsets", {
        "draft_id": draft_id,
        "position": body.position,
        "name": body.name,
        "payload": body.payload.model_dump()
    })


@router.patch("/drafts/{draft_id}/adsets/{adset_id}")
async def update_adset(
    draft_id: str,
    adset_id: str,
    body: AdSetDraftUpdate,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    adsets = await supabase_rest.select("campaign_draft_adsets", {
        "id": f"eq.{adset_id}", "draft_id": f"eq.{draft_id}", "limit": "1"
    })
    if not adsets:
        raise HTTPException(status_code=404, detail="Adset draft not found")
    payload = body.model_dump(exclude_unset=True)
    if "payload" in payload and payload["payload"] is not None:
        payload["payload"] = body.payload.model_dump()
    return await supabase_rest.update("campaign_draft_adsets", {
        "id": f"eq.{adset_id}", "draft_id": f"eq.{draft_id}"
    }, payload)


@router.delete("/drafts/{draft_id}/adsets/{adset_id}")
async def delete_adset(
    draft_id: str,
    adset_id: str,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    adsets = await supabase_rest.select("campaign_draft_adsets", {
        "id": f"eq.{adset_id}", "draft_id": f"eq.{draft_id}", "limit": "1"
    })
    if not adsets:
        raise HTTPException(status_code=404, detail="Adset draft not found")
    await supabase_rest.delete("campaign_draft_adsets", {
        "id": f"eq.{adset_id}", "draft_id": f"eq.{draft_id}"
    })
    return {"success": True}


@router.post("/drafts/{draft_id}/adsets/{adset_id}/ads")
async def add_ad(
    draft_id: str,
    adset_id: str,
    body: AdDraftCreate,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    adsets = await supabase_rest.select("campaign_draft_adsets", {
        "id": f"eq.{adset_id}", "draft_id": f"eq.{draft_id}", "limit": "1"
    })
    if not adsets:
        raise HTTPException(status_code=404, detail="Adset draft not found")
    return await supabase_rest.insert("campaign_draft_ads", {
        "adset_id": adset_id,
        "position": body.position,
        "name": body.name,
        "payload": body.payload.model_dump()
    })


@router.patch("/drafts/{draft_id}/ads/{ad_id}")
async def update_ad(
    draft_id: str,
    ad_id: str,
    body: AdDraftUpdate,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    ads = await supabase_rest.select("campaign_draft_ads", {
        "id": f"eq.{ad_id}", "limit": "1"
    })
    if not ads:
        raise HTTPException(status_code=404, detail="Ad draft not found")
    payload = body.model_dump(exclude_unset=True)
    if "payload" in payload and payload["payload"] is not None:
        payload["payload"] = body.payload.model_dump()
    return await supabase_rest.update("campaign_draft_ads", {"id": f"eq.{ad_id}"}, payload)


@router.delete("/drafts/{draft_id}/ads/{ad_id}")
async def delete_ad(
    draft_id: str,
    ad_id: str,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    ads = await supabase_rest.select("campaign_draft_ads", {
        "id": f"eq.{ad_id}", "limit": "1"
    })
    if not ads:
        raise HTTPException(status_code=404, detail="Ad draft not found")
    await supabase_rest.delete("campaign_draft_ads", {"id": f"eq.{ad_id}"})
    return {"success": True}


@router.get("/meta/pages")
async def list_meta_pages(
    account_id: Optional[str] = Query(None),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db)
):
    adapter = await _get_meta_adapter(org_id, db)
    try:
        return await adapter.list_pages(account_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/meta/pages/{page_id}/instagram-accounts")
async def list_meta_instagram_accounts(
    page_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db)
):
    adapter = await _get_meta_adapter(org_id, db)
    try:
        return await adapter.list_instagram_accounts(page_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/meta/accounts/{account_id}/custom-audiences")
async def list_meta_custom_audiences(
    account_id: str,
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db)
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.list_custom_audiences(account_id)


@router.get("/meta/targeting/search")
async def list_meta_targeting_search(
    q: str = Query(...),
    type: str = Query("country"),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db)
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.list_targeting_geo(query=q, type_val=type)


@router.get("/meta/targeting/interests")
async def list_meta_targeting_interests(
    q: str = Query(...),
    org_id: str = Depends(get_current_org_id),
    db: AsyncSession = Depends(get_db)
):
    adapter = await _get_meta_adapter(org_id, db)
    return await adapter.search_targeting_interests(query=q)


@router.post("/drafts/{draft_id}/media")
async def upload_draft_media(
    draft_id: str,
    file: UploadFile = File(...),
    kind: str = Query("image"),
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    draft = drafts[0]

    adapter = await _get_meta_adapter(org_id, None)
    file_bytes = await file.read()

    try:
        if kind == "video":
            meta_res = await adapter.upload_video(draft["platform_account_id"], file_bytes)
            return {
                "kind": "video",
                "video_id": meta_res.get("id"),
                "url": meta_res.get("url") or f"https://graph.facebook.com/v19.0/{meta_res.get('id')}"
            }
        else:
            meta_res = await adapter.upload_image(draft["platform_account_id"], file_bytes)
            return {
                "kind": "image",
                "hash": meta_res.get("hash"),
                "url": meta_res.get("url")
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/drafts/{draft_id}/publish")
async def publish_draft(
    draft_id: str,
    org_id: str = Depends(get_current_org_id),
):
    drafts = await supabase_rest.select("campaign_drafts", {
        "id": f"eq.{draft_id}", "org_id": f"eq.{org_id}", "limit": "1"
    })
    if not drafts:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # We need a proper dict object to work with
    draft_dict = drafts[0]
    
    adsets = await supabase_rest.select("campaign_draft_adsets", {
        "draft_id": f"eq.{draft_id}", "order": "position.asc"
    })

    if not adsets:
        raise HTTPException(status_code=400, detail="Cannot publish: draft has no ad sets")

    all_ads = []
    adset_ads_map = {}
    for adset in adsets:
        ads = await supabase_rest.select("campaign_draft_ads", {
            "adset_id": f"eq.{adset['id']}", "order": "position.asc"
        })
        if not ads:
            raise HTTPException(status_code=400, detail=f"Cannot publish: ad set '{adset['name']}' has no ads")
        adset_ads_map[adset["id"]] = ads
        all_ads.extend(ads)

    # Mark as publishing
    await supabase_rest.update("campaign_drafts", {"id": f"eq.{draft_id}"}, {"status": "publishing"})

    adapter = await _get_meta_adapter(org_id, None) # Pass None since we handle DB differently now
    try:
        # 1. Create Campaign on Meta
        cp = draft_dict.get("campaign_payload") or {}
        campaign_objective = cp.get("objective") or "OUTCOME_LEADS"
        
        meta_campaign_payload = {
            "name": draft_dict["name"],
            "objective": campaign_objective,
            "status": "PAUSED",
            "special_ad_categories": cp.get("special_ad_categories") or ["NONE"],
            "buying_type": cp.get("buying_type") or "AUCTION"
        }

        if cp.get("cbo_enabled"):
            if cp.get("daily_budget"):
                meta_campaign_payload["daily_budget"] = cp.get("daily_budget")
            elif cp.get("lifetime_budget"):
                meta_campaign_payload["lifetime_budget"] = cp.get("lifetime_budget")

        campaign_res = await adapter.create_campaign(draft_dict["platform_account_id"], meta_campaign_payload)
        published_campaign_id = campaign_res.get("id")
        
        # Update draft with campaign ID
        await supabase_rest.update("campaign_drafts", {"id": f"eq.{draft_id}"}, {"published_campaign_id": published_campaign_id})

        # 2. Create AdSets on Meta
        for adset in adsets:
            ap = adset.get("payload") or {}
            targeting_p = ap.get("targeting") or {}
            
            # Format targeting
            geo = targeting_p.get("geo_locations") or {}
            countries = geo.get("countries") or []
            regions = geo.get("regions") or []
            cities = geo.get("cities") or []
            
            geo_locations = {}
            if countries:
                geo_locations["countries"] = countries
            if regions:
                geo_locations["regions"] = [{"key": r} for r in regions]
            if cities:
                geo_locations["cities"] = [{"key": c} for c in cities]
            if not geo_locations:
                geo_locations["countries"] = ["MY"]

            meta_targeting = {
                "geo_locations": geo_locations,
                "age_min": targeting_p.get("age_min") or 18,
                "age_max": targeting_p.get("age_max") or 65
            }
            if targeting_p.get("genders"):
                meta_targeting["genders"] = targeting_p.get("genders")
            if targeting_p.get("interests"):
                meta_targeting["flexible_spec"] = [{"interests": [{"id": i["id"], "name": i["name"]} for i in targeting_p.get("interests")]}]
            if targeting_p.get("custom_audiences"):
                meta_targeting["custom_audiences"] = [{"id": ca["id"]} for ca in targeting_p.get("custom_audiences")]
            if targeting_p.get("excluded_custom_audiences"):
                meta_targeting["excluded_custom_audiences"] = [{"id": ca["id"]} for ca in targeting_p.get("excluded_custom_audiences")]

            # Placements
            pub_platforms = targeting_p.get("publisher_platforms") or ["facebook", "instagram"]
            meta_targeting["publisher_platforms"] = pub_platforms
            if targeting_p.get("facebook_positions") is not None:
                meta_targeting["facebook_positions"] = targeting_p.get("facebook_positions")
            if targeting_p.get("instagram_positions") is not None:
                meta_targeting["instagram_positions"] = targeting_p.get("instagram_positions")

            meta_adset_payload = {
                "name": adset["name"],
                "campaign_id": published_campaign_id,
                "billing_event": ap.get("billing_event") or "IMPRESSIONS",
                "optimization_goal": ap.get("optimization_goal") or "IMPRESSIONS",
                "bid_strategy": ap.get("bid_strategy") or "LOWEST_COST_WITHOUT_CAP",
                "targeting": meta_targeting,
                "start_time": ap.get("start_time"),
                "status": "PAUSED"
            }

            if not cp.get("cbo_enabled"):
                if ap.get("daily_budget"):
                    meta_adset_payload["daily_budget"] = ap.get("daily_budget")
                elif ap.get("lifetime_budget"):
                    meta_adset_payload["lifetime_budget"] = ap.get("lifetime_budget")

            if ap.get("end_time"):
                meta_adset_payload["end_time"] = ap.get("end_time")
            if ap.get("bid_amount"):
                meta_adset_payload["bid_amount"] = ap.get("bid_amount")

            if ap.get("pixel_id") and ap.get("custom_event_type"):
                meta_adset_payload["promoted_object"] = {
                    "pixel_id": ap.get("pixel_id"),
                    "custom_event_type": ap.get("custom_event_type")
                }
            elif ap.get("promoted_object"):
                meta_adset_payload["promoted_object"] = ap.get("promoted_object")

            adset_res = await adapter.create_adset(draft_dict["platform_account_id"], meta_adset_payload)
            published_adset_id = adset_res.get("id")
            
            # Update adset in DB
            await supabase_rest.update("campaign_draft_adsets", {"id": f"eq.{adset['id']}"}, {"published_adset_id": published_adset_id})

            # 3. Create Ads + Creative on Meta
            ads = adset_ads_map[adset["id"]]
            for ad in ads:
                adp = ad.get("payload") or {}
                
                # Image hash or video_id from media list
                media_list = adp.get("media") or []
                media_hash = None
                video_id = None
                
                if media_list:
                    first_media = media_list[0]
                    if first_media.get("kind") == "video":
                        video_id = first_media.get("video_id")
                    else:
                        media_hash = first_media.get("hash")

                # Build object story spec
                object_story_spec = {
                    "page_id": adp.get("page_id")
                }
                
                if adp.get("instagram_actor_id"):
                    object_story_spec["instagram_actor_id"] = adp.get("instagram_actor_id")

                link_data = {
                    "message": adp.get("primary_text"),
                    "name": adp.get("headline"),
                    "link": adp.get("destination_url"),
                    "call_to_action": {
                        "type": adp.get("cta_type") or "LEARN_MORE",
                        "value": {
                            "link": adp.get("destination_url")
                        }
                    }
                }
                if adp.get("description"):
                    link_data["description"] = adp.get("description")

                if video_id:
                    # Video creative
                    object_story_spec["video_data"] = {
                        "video_id": video_id,
                        "call_to_action": link_data["call_to_action"],
                        "title": adp.get("headline"),
                        "message": adp.get("primary_text")
                    }
                else:
                    # Image creative
                    if media_hash:
                        link_data["image_hash"] = media_hash
                    object_story_spec["link_data"] = link_data

                meta_creative_payload = {
                    "name": f"Creative for {ad['name']}",
                    "object_story_spec": object_story_spec
                }

                creative_res = await adapter.create_creative(draft_dict["platform_account_id"], meta_creative_payload)
                published_creative_id = creative_res.get("id")

                # Create Ad
                meta_ad_payload = {
                    "name": ad["name"],
                    "adset_id": published_adset_id,
                    "creative": {"creative_id": published_creative_id},
                    "status": "PAUSED"
                }
                if adp.get("url_tags"):
                    meta_ad_payload["url_tags"] = adp.get("url_tags")

                ad_res = await adapter.create_ad(draft_dict["platform_account_id"], meta_ad_payload)
                
                # Update ad in DB
                await supabase_rest.update("campaign_draft_ads", {"id": f"eq.{ad['id']}"}, {"published_ad_id": ad_res.get("id")})

        # Mark as published
        await supabase_rest.update("campaign_drafts", {"id": f"eq.{draft_id}"}, {"status": "published"})
        return {
            "success": True,
            "campaign_id": published_campaign_id
        }

    except Exception as e:
        await supabase_rest.update("campaign_drafts", {"id": f"eq.{draft_id}"}, {
            "status": "failed",
            "publish_error": {"message": str(e)}
        })
        raise HTTPException(status_code=400, detail=str(e))
