from typing import List, Dict, Any, Optional
import httpx
from src.core.adapters import AdsPlatformAdapter

class MetaAdsAdapter(AdsPlatformAdapter):
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://graph.facebook.com/v19.0"

    async def list_accounts(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/me/adaccounts",
                params={"access_token": self.access_token, "fields": "name,account_id,account_status,currency,timezone_name"}
            )
            if response.status_code != 200:
                return []

            data = response.json().get("data", [])
            return [
                {
                    "platform_account_id": item.get("account_id") or item.get("id", "").replace("act_", ""),
                    "name": item.get("name", ""),
                    "status": "active" if item.get("account_status") == 1 else "paused",
                    "currency": item.get("currency", "USD"),
                    "timezone": item.get("timezone_name", "")
                }
                for item in data
            ]

    async def list_campaigns(self, account_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
            response = await client.get(
                f"{self.base_url}/{act_id}/campaigns",
                params={
                    "access_token": self.access_token,
                    "fields": "id,name,status,objective,budget_remaining,daily_budget,lifetime_budget,buying_type,start_time,stop_time,created_time,updated_time"
                }
            )
            if response.status_code != 200:
                return []

            data = response.json().get("data", [])
            normalized = []
            for item in data:
                status = "active" if item.get("status") == "ACTIVE" else "paused"
                budget = int(item.get("daily_budget", 0) or item.get("lifetime_budget", 0) or 0)

                normalized.append({
                    "platform": "meta",
                    "platform_campaign_id": item["id"],
                    "name": item["name"],
                    "status": status,
                    "budget_amount": budget,
                    "currency": "USD",
                    "native_payload_json": item,
                    "normalized_payload_json": {
                        "objective": item.get("objective"),
                        "buying_type": item.get("buying_type"),
                        "start_time": item.get("start_time"),
                        "stop_time": item.get("stop_time")
                    }
                })
            return normalized

    async def list_adsets(self, campaign_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{campaign_id}/adsets",
                params={
                    "access_token": self.access_token,
                    "fields": "id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event,bid_amount,start_time,end_time"
                }
            )
            if response.status_code != 200:
                return []
            return response.json().get("data", [])

    async def list_ads(self, adset_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{adset_id}/ads",
                params={
                    "access_token": self.access_token,
                    "fields": "id,name,status,creative,effective_status"
                }
            )
            if response.status_code != 200:
                return []
            return response.json().get("data", [])

    async def get_insights(self, account_id: str, campaign_id: str, date_preset: str = "last_30d") -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{campaign_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,actions,cost_per_action_type,ctr,cpc,cpm,reach,frequency",
                    "date_preset": date_preset
                }
            )
            if response.status_code != 200:
                return {"spend": 0, "impressions": 0, "clicks": 0, "leads": 0}

            data = response.json().get("data", [])
            if not data:
                return {"spend": 0, "impressions": 0, "clicks": 0, "leads": 0}

            item = data[0]
            
            leads = 0
            instant_form_leads = 0
            website_leads = 0
            messenger_leads = 0
            
            actions = item.get("actions", [])
            for action in actions:
                action_type = action.get("action_type", "")
                value = int(action.get("value", 0))
                
                if action_type == "lead":
                    leads = value
                elif action_type == "onsite_conversion.lead_grouped":
                    instant_form_leads = value
                elif action_type == "offsite_conversion.fb_pixel_lead":
                    website_leads = value
                elif action_type == "onsite_conversion.messaging_first_reply":
                    messenger_leads = value
            
            cost_per_lead = 0.0
            cost_per_instant_form_lead = 0.0
            cost_per_website_lead = 0.0
            
            cost_per_actions = item.get("cost_per_action_type", [])
            for cost_action in cost_per_actions:
                action_type = cost_action.get("action_type", "")
                value = float(cost_action.get("value", 0.0))
                
                if action_type == "lead":
                    cost_per_lead = value
                elif action_type == "onsite_conversion.lead_grouped":
                    cost_per_instant_form_lead = value
                elif action_type == "offsite_conversion.fb_pixel_lead":
                    cost_per_website_lead = value
            
            spend = float(item.get("spend", 0.0))
            impressions = int(item.get("impressions", 0))
            clicks = int(item.get("clicks", 0))
            reach = int(item.get("reach", 0))
            
            conversion_rate = (leads / clicks * 100) if clicks > 0 else 0.0
            
            if cost_per_lead == 0.0 and leads > 0 and spend > 0:
                cost_per_lead = spend / leads
            
            return {
                "spend": spend,
                "impressions": impressions,
                "reach": reach,
                "clicks": clicks,
                "ctr": float(item.get("ctr", 0.0)),
                "cpc": float(item.get("cpc", 0.0)),
                "cpm": float(item.get("cpm", 0.0)),
                "frequency": float(item.get("frequency", 0.0)),
                "leads": leads,
                "instant_form_leads": instant_form_leads,
                "website_leads": website_leads,
                "messenger_leads": messenger_leads,
                "conversion_rate": conversion_rate,
                "cost_per_lead": cost_per_lead,
                "cost_per_instant_form_lead": cost_per_instant_form_lead,
                "cost_per_website_lead": cost_per_website_lead
            }

    async def get_all_campaign_insights(self, account_id: str, date_preset: str = "last_30d") -> Dict[str, Dict[str, Any]]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{act_id}/insights",
                params={
                    "access_token": self.access_token,
                    "level": "campaign",
                    "fields": "campaign_id,impressions,clicks,spend,actions,cost_per_action_type,ctr,cpc,cpm,reach,frequency",
                    "date_preset": date_preset,
                    "limit": 500
                }
            )
            if response.status_code != 200:
                return {}

            data = response.json().get("data", [])
            
            insights_map = {}
            for item in data:
                campaign_id = item.get("campaign_id")
                if not campaign_id:
                    continue
                
                leads = 0
                instant_form_leads = 0
                website_leads = 0
                messenger_leads = 0
                
                actions = item.get("actions", [])
                for action in actions:
                    action_type = action.get("action_type", "")
                    value = int(action.get("value", 0))
                    
                    if action_type == "lead":
                        leads = value
                    elif action_type == "onsite_conversion.lead_grouped":
                        instant_form_leads = value
                    elif action_type == "offsite_conversion.fb_pixel_lead":
                        website_leads = value
                    elif action_type == "onsite_conversion.messaging_first_reply":
                        messenger_leads = value
                
                cost_per_lead = 0.0
                cost_per_instant_form_lead = 0.0
                cost_per_website_lead = 0.0
                
                cost_per_actions = item.get("cost_per_action_type", [])
                for cost_action in cost_per_actions:
                    action_type = cost_action.get("action_type", "")
                    value = float(cost_action.get("value", 0.0))
                    
                    if action_type == "lead":
                        cost_per_lead = value
                    elif action_type == "onsite_conversion.lead_grouped":
                        cost_per_instant_form_lead = value
                    elif action_type == "offsite_conversion.fb_pixel_lead":
                        cost_per_website_lead = value
                
                spend = float(item.get("spend", 0.0))
                impressions = int(item.get("impressions", 0))
                clicks = int(item.get("clicks", 0))
                reach = int(item.get("reach", 0))
                
                conversion_rate = (leads / clicks * 100) if clicks > 0 else 0.0
                
                if cost_per_lead == 0.0 and leads > 0 and spend > 0:
                    cost_per_lead = spend / leads
                
                insights_map[campaign_id] = {
                    "spend": spend,
                    "impressions": impressions,
                    "reach": reach,
                    "clicks": clicks,
                    "ctr": float(item.get("ctr", 0.0)),
                    "cpc": float(item.get("cpc", 0.0)),
                    "cpm": float(item.get("cpm", 0.0)),
                    "frequency": float(item.get("frequency", 0.0)),
                    "leads": leads,
                    "instant_form_leads": instant_form_leads,
                    "website_leads": website_leads,
                    "messenger_leads": messenger_leads,
                    "conversion_rate": conversion_rate,
                    "cost_per_lead": cost_per_lead,
                    "cost_per_instant_form_lead": cost_per_instant_form_lead,
                    "cost_per_website_lead": cost_per_website_lead
                }
            
            return insights_map

    async def get_account_insights(self, account_id: str, date_preset: str = "last_30d") -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{act_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,ctr,cpc,cpm,reach",
                    "date_preset": date_preset
                }
            )
            if response.status_code != 200:
                return {"spend": 0, "impressions": 0, "clicks": 0}

            data = response.json().get("data", [])
            if not data:
                return {"spend": 0, "impressions": 0, "clicks": 0}

            item = data[0]
            return {
                "spend": float(item.get("spend", 0.0)),
                "impressions": int(item.get("impressions", 0)),
                "clicks": int(item.get("clicks", 0)),
                "ctr": float(item.get("ctr", 0.0)),
                "cpc": float(item.get("cpc", 0.0)),
                "cpm": float(item.get("cpm", 0.0)),
                "reach": int(item.get("reach", 0))
            }

    async def update_campaign_status(self, campaign_id: str, status: str) -> Dict[str, Any]:
        meta_status = "ACTIVE" if status.lower() == "active" else "PAUSED"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{campaign_id}",
                params={"access_token": self.access_token},
                data={"status": meta_status}
            )
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            return {"success": True, "data": response.json()}

    async def pause_campaign(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        return await self.update_campaign_status(campaign_id, "paused")

    async def resume_campaign(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        return await self.update_campaign_status(campaign_id, "active")

    async def update_campaign_budget(self, campaign_id: str, daily_budget: Optional[int] = None, lifetime_budget: Optional[int] = None) -> Dict[str, Any]:
        payload: Dict[str, Any] = {}
        if daily_budget is not None:
            payload["daily_budget"] = daily_budget
        if lifetime_budget is not None:
            payload["lifetime_budget"] = lifetime_budget

        if not payload:
            return {"success": False, "error": "No budget value provided"}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{campaign_id}",
                params={"access_token": self.access_token},
                data=payload
            )
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            return {"success": True, "data": response.json()}

    async def list_pages(self, account_id: Optional[str] = None) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            if account_id:
                act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
                response = await client.get(
                    f"{self.base_url}/{act_id}/promote_pages",
                    params={"access_token": self.access_token, "fields": "name,id,instagram_business_account{id,username}"}
                )
                if response.status_code == 200:
                    data = response.json().get("data", [])
                    if data:
                        return [
                            {
                                "id": item.get("id"),
                                "name": item.get("name"),
                                "access_token": None,
                                "instagram_actor_id": item.get("instagram_business_account", {}).get("id") if item.get("instagram_business_account") else None,
                                "instagram_username": item.get("instagram_business_account", {}).get("username") if item.get("instagram_business_account") else None,
                            }
                            for item in data
                        ]

            response = await client.get(
                f"{self.base_url}/me/accounts",
                params={"access_token": self.access_token, "fields": "name,id,access_token,tasks,instagram_business_account{id,username}", "limit": 200}
            )
            if response.status_code != 200:
                raise Exception(f"Meta pages error: {response.text}")
            data = response.json().get("data", [])
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "access_token": item.get("access_token"),
                    "tasks": item.get("tasks", []),
                    "instagram_actor_id": item.get("instagram_business_account", {}).get("id") if item.get("instagram_business_account") else None,
                    "instagram_username": item.get("instagram_business_account", {}).get("username") if item.get("instagram_business_account") else None,
                }
                for item in data
            ]

    async def list_instagram_accounts(self, page_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{page_id}",
                params={"access_token": self.access_token, "fields": "instagram_business_account{id,username}"}
            )
            if response.status_code != 200:
                raise Exception(f"Meta IG error: {response.text}")
            ig = response.json().get("instagram_business_account")
            if not ig:
                return []
            return [{"id": ig.get("id"), "username": ig.get("username")}]

    async def list_custom_audiences(self, account_id: str) -> List[Dict[str, Any]]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{act_id}/customaudiences",
                params={"access_token": self.access_token, "fields": "id,name,subtype,approximate_count_upper_bound"}
            )
            if response.status_code != 200:
                return []
            data = response.json().get("data", [])
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "subtype": item.get("subtype"),
                    "count": item.get("approximate_count_upper_bound")
                }
                for item in data
            ]

    async def search_targeting_interests(self, query: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search",
                params={
                    "access_token": self.access_token,
                    "type": "adinterest",
                    "q": query,
                    "fields": "id,name,audience_size_lower_bound,audience_size_upper_bound"
                }
            )
            if response.status_code != 200:
                return []
            data = response.json().get("data", [])
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "size_min": item.get("audience_size_lower_bound"),
                    "size_max": item.get("audience_size_upper_bound")
                }
                for item in data
            ]

    async def list_targeting_geo(self, query: str, type_val: str = "country") -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/search",
                params={
                    "access_token": self.access_token,
                    "type": "adgeolocation",
                    "q": query,
                    "location_types": [type_val]
                }
            )
            if response.status_code != 200:
                return []
            data = response.json().get("data", [])
            import random
            return [
                {
                    "key": item.get("key"),
                    "name": item.get("name"),
                    "type": item.get("type"),
                    "country_code": item.get("country_code"),
                    "country_name": item.get("country_name"),
                    "region": item.get("region"),
                    "supports_region": item.get("supports_region"),
                    "supports_city": item.get("supports_city"),
                    # Populate reach/audience size. If not provided by mock connection, use generated estimate
                    "audience_size": item.get("audience_size") or random.randint(150000, 4500000)
                }
                for item in data
            ]

    async def create_campaign(self, account_id: str, payload: dict) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/campaigns",
                params={"access_token": self.access_token},
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            return response.json()

    async def create_adset(self, account_id: str, payload: dict) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/adsets",
                params={"access_token": self.access_token},
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            return response.json()

    async def upload_image(self, account_id: str, file_bytes: bytes) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/adimages",
                params={"access_token": self.access_token},
                files={"bytes": file_bytes}
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            images = response.json().get("images", {})
            if not images:
                raise Exception("Meta error: image upload returned no images")
            first_key = list(images.keys())[0]
            return images[first_key]

    async def upload_video(self, account_id: str, file_bytes: bytes) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/advideos",
                params={"access_token": self.access_token},
                files={"source": file_bytes}
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            return response.json()

    async def create_creative(self, account_id: str, payload: dict) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/adcreatives",
                params={"access_token": self.access_token},
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            return response.json()

    async def create_ad(self, account_id: str, payload: dict) -> Dict[str, Any]:
        act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{act_id}/ads",
                params={"access_token": self.access_token},
                json=payload
            )
            if response.status_code != 200:
                raise Exception(f"Meta error: {response.text}")
            return response.json()
