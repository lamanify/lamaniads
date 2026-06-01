import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.core.meta_adapter import MetaAdsAdapter

LAMANIFY_ACCOUNTS = [
    ("123828087484282", "Lamanify v2"),
    ("647498000485304", "Lamanify Web Services"),
    ("1940805593095476", "Lamanify (External)"),
    ("1295522382148430", "Lamanify Sdn Bhd (Read-Only)"),
    ("866759839000663", "Lamanify (Read-Only)"),
]

async def main():
    token = "EAAXlGIQcwOcBRh5IUymCmgLlqq62fES6hnl010hAr7ZAWaH0DZBIIiG2Gkf8yiXIeEZASm6BQ3FZCa6FrLoCfaEqXHJ6AT9xWK7c99rkXkopihS9arZB1HS4DoU9xt7XiSNs7wZAZBAOZA7mYZCFgyt8BKOf57oMdOMPAaXPaF746f2ZAeEVXqi65VF0Q6u7zM1VpLQ4WciMKyd0RwFOBMJh4YBFI9llp4Mqes1w2DHa4eVOhkn7v68ywJxkUX9jiLQmBUkPHS4FKX3hbQq7zmpFdstv09EAtYyZBOT"
    adapter = MetaAdsAdapter(token)

    for account_id, account_name in LAMANIFY_ACCOUNTS:
        print(f"\n{'='*70}")
        print(f"ACCOUNT: {account_name} (ID: {account_id})")
        print('='*70)
        campaigns = await adapter.list_campaigns(account_id)
        print(f"Campaigns count: {len(campaigns)}")
        for c in campaigns:
            print(f"  - [{c['status']}] {c['name']} (ID: {c['platform_campaign_id']}, Budget: {c['budget_amount']})")

if __name__ == "__main__":
    asyncio.run(main())
