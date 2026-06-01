---
name: "cloudflare-pages-deploy"
description: "Deploys Next.js apps to Cloudflare Pages. Invoke when user wants to deploy/push to Cloudflare or publish web apps to production."
---

# Cloudflare Pages Deployment

This skill handles deploying Next.js applications to Cloudflare Pages with the correct build and deployment workflow.

## When to Use

Invoke this skill when:
- User wants to deploy a Next.js app to Cloudflare Pages
- User asks to "push to Cloudflare" or "publish to Cloudflare"
- User wants to update an existing Cloudflare Pages deployment
- User mentions deploying web apps to production on Cloudflare

## Prerequisites

Before deployment, ensure you have:
1. **Cloudflare Account ID** - Found in Cloudflare dashboard URL
2. **Cloudflare API Token** with these permissions:
   - Account → Cloudflare Pages → Edit
   - Account → Account Settings → Read
3. **Project name** for the Cloudflare Pages project

## Deployment Workflow

### Step 1: Configure Next.js for Static Export

Update `next.config.js` to enable static export:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

module.exports = nextConfig;
```

**Note**: Static export means no server-side rendering (SSR). All pages are pre-rendered at build time.

### Step 2: Build the Next.js App

Run the Next.js build command:

```bash
CI=true node_modules/.bin/next build
```

This generates static files in the `out/` directory.

**Important**: Use `CI=true` to avoid interactive prompts and use the local `node_modules/.bin/next` binary to avoid pnpm workspace issues.

### Step 3: Deploy to Cloudflare Pages

Deploy the static output using wrangler:

```bash
CLOUDFLARE_ACCOUNT_ID=<account-id> \
CLOUDFLARE_API_TOKEN=<api-token> \
node_modules/.bin/wrangler pages deploy out \
  --project-name <project-name> \
  --commit-dirty=true
```

**Parameters**:
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN`: API token with Pages Edit permissions
- `--project-name`: Name of the Cloudflare Pages project
- `--commit-dirty=true`: Skip git uncommitted changes warning
- `out`: Directory containing the static build output

## Common Issues & Solutions

### Issue: pnpm `minimumReleaseAge` Policy Error

**Symptom**: Build fails with `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`

**Solution**: 
1. Bypass pnpm by using the local Next.js binary directly
2. Use `CI=true` environment variable
3. Run `next build` instead of `pnpm run build`

### Issue: Authentication Error (code: 10000)

**Symptom**: `Authentication error [code: 10000]` or `Invalid access token [code: 9109]`

**Solution**:
1. Verify the API token has correct permissions:
   - Account → Cloudflare Pages → Edit
   - Account → Account Settings → Read
2. Ensure the token is for the correct account ID
3. Create a new token if the old one is expired/invalid

### Issue: Wrangler Not Found

**Symptom**: `wrangler: command not found`

**Solution**:
1. Use the local binary: `node_modules/.bin/wrangler`
2. Or install wrangler: `pnpm add -D wrangler`

## Example: Complete Deployment

```bash
# 1. Navigate to the web app directory
cd apps/web

# 2. Ensure next.config.js has output: 'export'

# 3. Build the app
CI=true node_modules/.bin/next build

# 4. Deploy to Cloudflare Pages
CLOUDFLARE_ACCOUNT_ID=55b3d9f3a50bd65a94d680f9e08a96ca \
CLOUDFLARE_API_TOKEN=cfat_xxxxxxxxxxxxxxxxxxxxx \
node_modules/.bin/wrangler pages deploy out \
  --project-name lamaniads \
  --commit-dirty=true
```

## Deployment Output

Successful deployment shows:
```
✨ Success! Uploaded X files (Y already uploaded)
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://xxxxx.project-name.pages.dev
```

The deployment URL is unique for each deployment and follows the pattern:
`https://<deployment-id>.<project-name>.pages.dev`

## Best Practices

1. **Use Static Export**: For Next.js apps without SSR requirements, static export is simpler and faster
2. **Environment Variables**: Store API tokens securely, never commit them to git
3. **Local Binaries**: Use `node_modules/.bin/` binaries to avoid version conflicts
4. **CI Mode**: Always use `CI=true` for non-interactive builds
5. **Git Workflow**: Commit changes before deploying for better tracking

## Alternative: OpenNext for SSR

If you need server-side rendering (SSR), use OpenNext instead:

1. Install: `pnpm add -D @opennextjs/cloudflare`
2. Create `open-next.config.ts`:
```typescript
import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
    },
  },
};

export default config;
```
3. Build: `npx open-next build`
4. Deploy: `wrangler pages deploy .open-next/worker`

**Note**: OpenNext requires Next.js 15+ and may have dependency issues with pnpm's security policies.

## Troubleshooting Checklist

- [ ] API token has correct permissions
- [ ] Account ID matches the Cloudflare dashboard
- [ ] `next.config.js` has `output: 'export'`
- [ ] Build completed successfully (check `out/` directory exists)
- [ ] Using local binaries (`node_modules/.bin/`)
- [ ] No uncommitted changes warning (use `--commit-dirty=true`)

## References

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
