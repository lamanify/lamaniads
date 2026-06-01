from typing import Any, Dict, List, Optional
import httpx
from src.core.config import settings


class SupabaseRestClient:
    def __init__(self):
        self.url = settings.NEXT_PUBLIC_SUPABASE_URL.rstrip("/")
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY

    def _headers(self, prefer: Optional[str] = None) -> Dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    async def select(
        self,
        table: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(
                f"{self.url}/rest/v1/{table}",
                params=params or {},
                headers=self._headers(),
            )
            res.raise_for_status()
            return res.json()

    async def insert(self, table: str, body: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(
                f"{self.url}/rest/v1/{table}",
                json=body,
                headers=self._headers(prefer="return=representation"),
            )
            if res.is_error:
                raise Exception(res.text)
            data = res.json()
            return data[0] if isinstance(data, list) and data else data

    async def update(
        self,
        table: str,
        params: Dict[str, Any],
        body: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.patch(
                f"{self.url}/rest/v1/{table}",
                params=params,
                json=body,
                headers=self._headers(prefer="return=representation"),
            )
            res.raise_for_status()
            data = res.json()
            return data[0] if isinstance(data, list) and data else None

    async def delete(self, table: str, params: Dict[str, Any]) -> bool:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.delete(
                f"{self.url}/rest/v1/{table}",
                params=params,
                headers=self._headers(),
            )
            res.raise_for_status()
            return True


supabase_rest = SupabaseRestClient()
