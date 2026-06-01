from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal

class CampaignDraftPayload(BaseModel):
    objective: Optional[Literal['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_APP_PROMOTION', 'OUTCOME_SALES']] = None
    buying_type: str = "AUCTION"
    special_ad_categories: List[str] = []
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None
    cbo_enabled: bool = False

class CampaignDraftCreate(BaseModel):
    platform_account_id: str
    name: str
    client_name: Optional[str] = None
    internal_naming: Optional[str] = None

class CampaignDraftUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    internal_naming: Optional[str] = None
    status: Optional[str] = None
    step: Optional[int] = None
    campaign_payload: Optional[CampaignDraftPayload] = None

class TargetingPayload(BaseModel):
    geo_locations: Dict[str, List[str]] = {"countries": [], "regions": [], "cities": []}
    age_min: int = 18
    age_max: int = 65
    genders: List[int] = []
    interests: List[Dict[str, str]] = []
    custom_audiences: List[Dict[str, str]] = []
    excluded_custom_audiences: List[Dict[str, str]] = []
    publisher_platforms: List[str] = ["facebook", "instagram"]
    facebook_positions: Optional[List[str]] = None
    instagram_positions: Optional[List[str]] = None

class AdSetDraftPayload(BaseModel):
    conversion_location: Literal['website', 'app', 'messenger', 'instant_form', 'calls', 'on_ad']
    optimization_goal: str
    billing_event: str
    bid_strategy: str = "LOWEST_COST_WITHOUT_CAP"
    bid_amount: Optional[int] = None
    daily_budget: Optional[int] = None
    lifetime_budget: Optional[int] = None
    targeting: TargetingPayload = TargetingPayload()
    start_time: str
    end_time: Optional[str] = None
    pixel_id: Optional[str] = None
    custom_event_type: Optional[str] = None
    promoted_object: Optional[Dict[str, Any]] = None

class AdSetDraftCreate(BaseModel):
    name: str
    position: int = 0
    payload: AdSetDraftPayload

class AdSetDraftUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    payload: Optional[AdSetDraftPayload] = None

class MediaItem(BaseModel):
    kind: Literal['image', 'video']
    hash: Optional[str] = None
    video_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    url: Optional[str] = None

class AdDraftPayload(BaseModel):
    page_id: str
    instagram_actor_id: Optional[str] = None
    format: Literal['single_image', 'single_video', 'carousel']
    primary_text: str
    headline: str
    description: Optional[str] = None
    cta_type: str
    destination_url: str
    media: List[MediaItem] = []
    url_tags: Optional[str] = None
    tracking_specs: Optional[List[Dict[str, Any]]] = None

class AdDraftCreate(BaseModel):
    name: str
    position: int = 0
    payload: AdDraftPayload

class AdDraftUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    payload: Optional[AdDraftPayload] = None
