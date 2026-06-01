from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class AdsPlatformAdapter(ABC):
    
    @abstractmethod
    async def list_accounts(self) -> List[Dict[str, Any]]:
        """
        List all accessible ad accounts for the connection.
        """
        pass
        
    @abstractmethod
    async def list_campaigns(self, account_id: str) -> List[Dict[str, Any]]:
        """
        List all campaigns inside an ad account, normalising to our canonical schema.
        """
        pass
        
    @abstractmethod
    async def get_insights(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        """
        Get daily metrics/insights for a specific campaign.
        """
        pass

    async def pause_campaign(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        """
        Pause a campaign at the platform.
        """
        raise NotImplementedError

    async def resume_campaign(self, account_id: str, campaign_id: str) -> Dict[str, Any]:
        """
        Resume a paused campaign at the platform.
        """
        raise NotImplementedError

    async def update_campaign_budget(self, campaign_id: str, daily_budget: Optional[int] = None, lifetime_budget: Optional[int] = None) -> Dict[str, Any]:
        """
        Update the budget on a campaign.
        """
        raise NotImplementedError
