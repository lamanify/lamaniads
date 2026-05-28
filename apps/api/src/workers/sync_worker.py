from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, update
import asyncio
from src.core.config import settings
from src.db.base import PlatformConnection, PlatformAccount, Campaign
from src.core.meta_adapter import MetaAdsAdapter
from src.core.google_adapter import GoogleAdsAdapter
from src.core.vault import decrypt_token

def get_async_url():
    url = settings.DATABASE_URL
    # Normalize postgres:// to postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    # Strip ?schema= query parameter if present, as asyncpg does not support it
    if "?" in url:
        base_url, query_params = url.split("?", 1)
        params = [p for p in query_params.split("&") if not p.startswith("schema=")]
        if params:
            url = f"{base_url}?{'&'.join(params)}"
        else:
            url = base_url

    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://")
    return url

engine = create_async_engine(get_async_url(), echo=False)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def sync_platform_data(org_id: str, platform_connection_id: str):
    async with SessionLocal() as db:
        # 1. Fetch connection details
        query = select(PlatformConnection).where(PlatformConnection.id == platform_connection_id)
        result = await db.execute(query)
        connection = result.scalar_one_or_none()
        
        if not connection or connection.status != "active":
            return {"status": "error", "message": "Connection inactive"}

        # 2. Decrypt token safely
        access_token = decrypt_token(connection.access_token_encrypted)
        
        # 3. Instantiate platform-specific adapter
        if connection.platform == "meta":
            adapter = MetaAdsAdapter(access_token)
        elif connection.platform == "google":
            dev_token = settings.GOOGLE_DEVELOPER_TOKEN or "mock_dev_token"
            adapter = GoogleAdsAdapter(dev_token, access_token)
        else:
            return {"status": "error", "message": "Unsupported platform"}

        # 4. Fetch and Sync Accounts
        accounts = await adapter.list_accounts()
        for acc in accounts:
            # Idempotent Upsert for Accounts
            acc_query = select(PlatformAccount).where(
                PlatformAccount.org_id == org_id,
                PlatformAccount.platform == connection.platform,
                PlatformAccount.platform_account_id == acc["platform_account_id"]
            )
            acc_result = await db.execute(acc_query)
            existing_acc = acc_result.scalar_one_or_none()
            
            if not existing_acc:
                db_acc = PlatformAccount(
                    org_id=org_id,
                    platform=connection.platform,
                    platform_account_id=acc["platform_account_id"],
                    name=acc["name"],
                    status=acc["status"]
                )
                db.add(db_acc)
            else:
                existing_acc.name = acc["name"]
                existing_acc.status = acc["status"]
                
            # 5. Fetch and Sync Campaigns for each account
            campaigns = await adapter.list_campaigns(acc["platform_account_id"])
            for camp in campaigns:
                camp_query = select(Campaign).where(
                    Campaign.org_id == org_id,
                    Campaign.platform == connection.platform,
                    Campaign.platform_campaign_id == camp["platform_campaign_id"]
                )
                camp_result = await db.execute(camp_query)
                existing_camp = camp_result.scalar_one_or_none()
                
                if not existing_camp:
                    db_camp = Campaign(
                        org_id=org_id,
                        platform=connection.platform,
                        platform_account_id=acc["platform_account_id"],
                        platform_campaign_id=camp["platform_campaign_id"],
                        name=camp["name"],
                        status=camp["status"],
                        budget_amount=camp["budget_amount"],
                        currency=camp["currency"],
                        native_payload_json=camp["native_payload_json"],
                        normalized_payload_json=camp["normalized_payload_json"]
                    )
                    db.add(db_camp)
                else:
                    existing_camp.name = camp["name"]
                    existing_camp.status = camp["status"]
                    existing_camp.budget_amount = camp["budget_amount"]
                    existing_camp.native_payload_json = camp["native_payload_json"]
                    existing_camp.normalized_payload_json = camp["normalized_payload_json"]
        
        await db.commit()
        return {"status": "success", "synced_accounts_count": len(accounts)}

# Handler for RQ Queue workers
def run_sync_job(org_id: str, platform_connection_id: str):
    return asyncio.run(sync_platform_data(org_id, platform_connection_id))
