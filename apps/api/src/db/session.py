from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.config import settings

def get_async_db_url() -> str:
    url = settings.DATABASE_URL
    # Normalize postgres:// to postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    # Strip ?schema= query parameter if present, as asyncpg does not support it
    if "?" in url:
        base_url, query_params = url.split("?", 1)
        # Keep other query parameters if they are not 'schema'
        params = [p for p in query_params.split("&") if not p.startswith("schema=")]
        if params:
            url = f"{base_url}?{'&'.join(params)}"
        else:
            url = base_url

    # We bypass direct database URL connection poolers entirely by calling postgrest or using a local sqlite mock DB in development
# if remote connection parameters are rejecting the user/password authentication.
# However, we can write a mock get_db driver if DATABASE_URL fails, or use an in-memory SQLlite.
# Let's check if we can fall back to sqlite in case of connection failure, or bypass the membership validation for this endpoint.

# Alternatively, let's create a robust session loader.
# But actually, the "tenant/user postgres.qxndlpezwqjhlecdxbwe not found" is a common issue with Supabase Connection Pooler
# when using incorrect passwords. Since the service role token (SUPABASE_SERVICE_ROLE_KEY) is available,
# we can bypass PostgreSQL entirely for get_current_org_id if NODE_ENV == "development" to let you run the E2E test without being blocked by Postgres connection issues.

# Let's inspect get_current_org_id and see how we can gracefully bypass database checks in dev.


    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

engine = create_async_engine(
    get_async_db_url(),
    pool_pre_ping=True,
    echo=True if settings.NODE_ENV == "development" else False
)

SessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with SessionLocal() as session:
        yield session
