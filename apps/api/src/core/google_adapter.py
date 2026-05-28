from typing import List, Dict, Any
import httpx
from src.core.adapters import AdsPlatformAdapter

class GoogleAdsAdapter(AdsPlatformAdapter):
    def __init__(self, developer_token: str, access_token: str):
        self.developer_token = developer_token
        self.access_token = access_token
        self.base_url = "https://googleads.googleapis.com/v16"

    async def list_accounts(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            # Fetch manager-customer tree clients or accessible clients
            response = await client.get(
                f"{self.base_url}/customers:listAccessibleCustomers",
                headers={
                    "developer-token": self.developer_token,
                    "Authorization": f"Bearer {self.access_token}"
                }
            )
            if response.status_code != 200:
                return []
            
            resource_names = response.json().get("resourceNames", [])
            accounts = []
            for name in resource_names:
                # Format: "customers/1234567890"
                cust_id = name.split("/")[-1]
                accounts.append({
                    "platform_account_id": cust_id,
                    "name": f"Google Ads Customer ({cust_id})",
                    "status": "active"
                })
            return accounts

    async def list_campaigns(self, account_id: str) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                campaign.id, 
                campaign.name, 
                campaign.status, 
                campaign.campaign_budget,
                campaign.advertising_channel_type
            FROM campaign
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/customers/{account_id}/googleAds:search",
                headers={
                    "developer-token": self.developer_token,
                    "Authorization": f"Bearer {self.access_token}"
                },
                json={"query": query}
            )
            if response.status_code != 200:
                return []
            
            results = response.json().get("results", [])
            normalized = []
            for item in results:
                campaign = item.get("campaign", {})
                status = "active" if campaign.get("status") == "ENABLED" else "paused"
                
                normalized.append({
                    "platform": "google",
                    "platform_campaign_id": str(campaign["id"]),
                    "name": campaign["name"],
                    "status": status,
                    "budget_amount": 0, # In practice parsed from campaign_budget resource lookup
                    "currency": "USD",
                    "native_payload_json": item,
                    "normalized_payload_json": {
                        "advertising_channel_type": campaign.get("advertising_channel_type")
                    }
                })
            return normalized

    async def get_insights(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        query = f"""
            SELECT 
                metrics.clicks, 
                metrics.impressions, 
                metrics.cost_micros, 
                metrics.conversions
            FROM campaign
            WHERE campaign.id = {campaign_id}
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/customers/{account_id}/googleAds:search",
                headers={
                    "developer-token": self.developer_token,
                    "Authorization": f"Bearer {self.access_token}"
                },
                json={"query": query}
            )
            if response.status_code != 200:
                return {"spend": 0, "impressions": 0, "clicks": 0, "conversions": 0}
            
            results = response.json().get("results", [])
            if not results:
                return {"spend": 0, "impressions": 0, "clicks": 0, "conversions": 0}
            
            metrics = results[0].get("metrics", {})
            # Cost micros to standard decimal units
            spend = float(metrics.get("costMicros", 0)) / 1000000.0
            
            return {
                "spend": spend,
                "impressions": int(metrics.get("impressions", 0)),
                "clicks": int(metrics.get("clicks", 0)),
                "conversions": int(metrics.get("conversions", 0))
            }
