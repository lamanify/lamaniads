#!/usr/bin/env bash
set -euo pipefail

# Ensure running from repo root
cd "$(dirname "$0")/../.."

echo "🚀 Starting LamaniAds Scaffold Bootstrapper..."

# Check dependencies
for cmd in pnpm node docker uv; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "❌ Error: $cmd is required but not installed." >&2
    exit 1
  fi
done

# Copy .env.example if no .env exists
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
fi

echo "📦 Installing Node dependencies..."
pnpm install

echo "🐳 Launching local Docker database & cache services..."
docker compose -f infra/compose/compose.dev.yml up -d

echo "📡 Checking Docker health status..."
until docker exec lamani-ads-postgres pg_isready -U postgres &> /dev/null; do
  echo "⏳ Waiting for Postgres to be healthy..."
  sleep 1
done

echo "✅ Local databases are healthy!"
echo "🎉 Scaffolding foundations ready! Next step: code generation of shared packages."
