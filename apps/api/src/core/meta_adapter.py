from typing import List, Dict, Any
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
                params={"access_token": self.access_token, "fields": "name,adaccount_id,account_status"}
            )
            if response.status_code != 200:
                return []
            
            data = response.json().get("data", [])
            return [
                {
                    "platform_account_id": item["adaccount_id"],
                    "name": item["name"],
                    "status": "active" if item["account_status"] == 1 else "paused"
                }
                for item in data
            ]

    async def list_campaigns(self, account_id: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            # Prepend 'act_' to account_id as required by Meta API
            act_id = f"act_{account_id}" if not account_id.startswith("act_") else account_id
            response = await client.get(
                f"{self.base_url}/{act_id}/campaigns",
                params={
                    "access_token": self.access_token,
                    "fields": "id,name,status,objective,budget_remaining,daily_budget,buying_type"
                }
            )
            if response.status_code != 200:
                return []
            
            data = response.json().get("data", [])
            normalized = []
            for item in data:
                # Standardize status
                status = "active" if item.get("status") == "ACTIVE" else "paused"
                budget = int(item.get("daily_budget", 0))
                
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
                        "buying_type": item.get("buying_type")
                    }
                })
            return normalized

    async def get_insights(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{campaign_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,conversions"
                }
            )
            if response.status_code != 200:
                return {"spend": 0, "impressions": 0, "clicks": 0, "conversions": 0}
            
            data = response.json().get("data", [])
            if not data:
                return {"spend": 0, "impressions": 0, "clicks": 0, "conversions": 0}
                
            item = data[0]
            return {
                "spend": float(item.get("spend", 0.0)),
                "impressions": int(item.get("impressions", 0)),
                "clicks": int(item.get("clicks", 0)),
                "conversions": len(item.get("conversions", []))
            }
