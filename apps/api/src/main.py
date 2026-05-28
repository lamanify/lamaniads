from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
from src.api.auth_platforms import router as platform_router
from src.api.campaigns import router as campaign_router

logger = structlog.get_logger()

app = FastAPI(
    title="LamaniAds API",
    version="0.1.0",
    description="Unified Ads Control Plane API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(platform_router)
app.include_router(campaign_router)

@app.get("/healthz")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/")
async def root():
    return {"message": "LamaniAds API is operational"}
