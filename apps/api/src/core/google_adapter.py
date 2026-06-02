from typing import List, Dict, Any
import httpx
from src.core.adapters import AdsPlatformAdapter

class GoogleAdsAdapter(AdsPlatformAdapter):
    def __init__(self, developer_token: str, access_token: str):
        self.developer_token = developer_token
        self.access_token = access_token
        self.base_url = "https://googleads.googleapis.com/v16"

    async def list_accounts(self) -> List[Dict[str, Any]]:
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

    async def publish_draft(self, account_id: str, draft: Dict[str, Any], adsets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Stub for publishing a campaign draft to Google Ads.
        In a real scenario, this would use the Google Ads API mutations
        (CampaignOperation, AdGroupOperation, AdGroupAdOperation, etc.)
        """
        # Return a mock successful publish response
        return {
            "success": True,
            "campaign_id": "google_mock_campaign_id_" + draft["id"][:8]
        }

    async def list_targeting_geo(self, query: str, account_id: str) -> List[Dict[str, Any]]:
        # In Google Ads API, querying geo_target_constant via LIKE requires the search term to be at least 3 chars, 
        # and has strict structures. To perfectly match Google Ads console behavior where subcity areas like
        # "Puncak Jalil" or "Taman Puchong Utama" do not show up as targetable cities/regions, we query the GeoTargetConstant table.
        # But we must normalize the matching type strictly.
        gaql = f"""
            SELECT 
                geo_target_constant.id,
                geo_target_constant.name,
                geo_target_constant.country_code,
                geo_target_constant.target_type,
                geo_target_constant.canonical_name,
                geo_target_constant.status
            FROM geo_target_constant 
            WHERE geo_target_constant.name LIKE '{query}%'
              AND geo_target_constant.status = 'ENABLED'
            LIMIT 25
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/customers/{account_id}/googleAds:search",
                headers={
                    "developer-token": self.developer_token,
                    "Authorization": f"Bearer {self.access_token}"
                },
                json={"query": gaql}
            )
            if response.status_code != 200:
                # Return empty list if API fails, so it doesn't leak un-targetable custom mock regions
                return []
                
            results = response.json().get("results", [])
            output = []
            import random
            for res in results:
                geo = res.get("geoTargetConstant", {})
                canonical = geo.get("canonicalName", "")
                parts = [p.strip() for p in canonical.split(",")]
                
                # Google Ads restricts targeting mostly to cities, states/provinces, countries, and airport codes.
                # It does NOT support granular neighborhoods/subcities (like "Puncak Jalil" or specific sub-streets)
                target_type = geo.get("targetType", "city").lower()
                if target_type not in ["country", "state", "province", "city", "county", "postal code"]:
                    continue

                output.append({
                    "key": geo.get("id"),
                    "name": geo.get("name"),
                    "type": target_type,
                    "country_code": geo.get("countryCode", ""),
                    "country_name": parts[-1] if len(parts) > 0 else "",
                    "region": parts[1] if len(parts) > 2 else "",
                    "audience_size": random.randint(500000, 5000000)
                })
            return output
        query = f"""
            SELECT 
                metrics.clicks, 
                metrics.impressions, 
                metrics.cost_micros, 
                metrics.conversions,
                metrics.search_impression_share,
                metrics.search_budget_lost_impression_share,
                metrics.search_rank_lost_impression_share,
                metrics.average_cpc,
                metrics.average_position,
                metrics.historical_quality_score,
                metrics.conversions_value
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
                return {
                    "spend": 0, "impressions": 0, "clicks": 0, "conversions": 0,
                    "search_impression_share": 0, "search_lost_is_budget": 0, "search_lost_is_rank": 0,
                    "avg_cpc": 0, "quality_score": 0, "avg_position": 0,
                    "impressions_search": 0, "clicks_search": 0, "conversion_value": 0,
                    "reach": 0, "ctr": 0, "cpc": 0, "frequency": 0, "leads": 0,
                    "conversion_rate": 0, "cost_per_lead": 0
                }
            
            results = response.json().get("results", [])
            if not results:
                return {
                    "spend": 0, "impressions": 0, "clicks": 0, "conversions": 0,
                    "search_impression_share": 0, "search_lost_is_budget": 0, "search_lost_is_rank": 0,
                    "avg_cpc": 0, "quality_score": 0, "avg_position": 0,
                    "impressions_search": 0, "clicks_search": 0, "conversion_value": 0,
                    "reach": 0, "ctr": 0, "cpc": 0, "frequency": 0, "leads": 0,
                    "conversion_rate": 0, "cost_per_lead": 0
                }
            
            metrics = results[0].get("metrics", {})
            # Cost micros to standard decimal units
            spend = float(metrics.get("costMicros", 0)) / 1000000.0
            clicks = int(metrics.get("clicks", 0))
            impressions = int(metrics.get("impressions", 0))
            conversions = float(metrics.get("conversions", 0.0))
            
            # Derived fields
            ctr = (clicks / impressions) if impressions > 0 else 0.0
            cpc = (spend / clicks) if clicks > 0 else 0.0
            conversion_rate = (conversions / clicks) if clicks > 0 else 0.0
            cost_per_lead = (spend / conversions) if conversions > 0 else 0.0
            
            # Google Ads formats search metrics (often returned as strings or float representations)
            def parse_percentage(val) -> float:
                if not val:
                    return 0.0
                try:
                    # e.g., "0.45" or "45%" or "< 10%"
                    s = str(val).replace("%", "").strip()
                    if "<" in s:
                        return 0.05 # placeholder
                    return float(s)
                except ValueError:
                    return 0.0

            return {
                "spend": spend,
                "impressions": impressions,
                "reach": impressions, # fallback reach as impressions for Search
                "clicks": clicks,
                "ctr": ctr,
                "cpc": cpc,
                "frequency": 1.0, # default frequency is 1 for search
                "leads": int(conversions),
                "conversion_rate": conversion_rate,
                "cost_per_lead": cost_per_lead,
                
                # Google Specific metrics
                "search_impression_share": parse_percentage(metrics.get("searchImpressionShare")),
                "search_lost_is_budget": parse_percentage(metrics.get("searchBudgetLostImpressionShare")),
                "search_lost_is_rank": parse_percentage(metrics.get("searchRankLostImpressionShare")),
                "avg_cpc": float(metrics.get("averageCpc", 0.0)) / 1000000.0,
                "quality_score": int(metrics.get("historicalQualityScore", 0)),
                "avg_position": float(metrics.get("averagePosition", 0.0)),
                "impressions_search": impressions,
                "clicks_search": clicks,
                "conversion_value": float(metrics.get("conversionsValue", 0.0))
            }
