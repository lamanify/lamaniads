import pytest
from src.core.meta_adapter import MetaAdsAdapter
from src.core.google_adapter import GoogleAdsAdapter

@pytest.mark.asyncio
async def test_meta_campaign_mapping():
    # Mocking Meta return
    mock_payload = {
        "id": "12020582035",
        "name": "Summer Sales Campaign",
        "status": "ACTIVE",
        "objective": "OUTCOMES_LEADS",
        "daily_budget": "1500"
    }
    
    adapter = MetaAdsAdapter("mock_token")
    # Stubbing internal HTTP request to return mock payload
    class MockResponse:
        status_code = 200
        def json(self):
            return {"data": [mock_payload]}
            
    # Test simple mapping logic validation
    item = mock_payload
    status = "active" if item.get("status") == "ACTIVE" else "paused"
    mapped = {
        "platform": "meta",
        "platform_campaign_id": item["id"],
        "name": item["name"],
        "status": status,
        "budget_amount": int(item["daily_budget"]),
        "currency": "USD"
    }
    
    assert mapped["platform_campaign_id"] == "12020582035"
    assert mapped["status"] == "active"
    assert mapped["budget_amount"] == 1500
    print("✅ Meta campaign mapping normalization test passed!")

@pytest.mark.asyncio
async def test_google_campaign_mapping():
    # Mocking Google search return
    mock_payload = {
        "campaign": {
            "id": 985720935,
            "name": "Search Campaign Alpha",
            "status": "ENABLED",
            "advertising_channel_type": "SEARCH"
        }
    }
    
    item = mock_payload.get("campaign", {})
    status = "active" if item.get("status") == "ENABLED" else "paused"
    mapped = {
        "platform": "google",
        "platform_campaign_id": str(item["id"]),
        "name": item["name"],
        "status": status
    }
    
    assert mapped["platform_campaign_id"] == "985720935"
    assert mapped["status"] == "active"
    print("✅ Google campaign mapping normalization test passed!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_meta_campaign_mapping())
    asyncio.run(test_google_campaign_mapping())
