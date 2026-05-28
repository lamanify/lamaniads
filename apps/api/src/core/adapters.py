from abc import ABC, abstractmethod
from typing import List, Dict, Any

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
