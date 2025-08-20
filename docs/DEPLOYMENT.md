# Deployment & Rollback Guide

## Automatic Deployment

The project is configured with automatic deployment to Netlify on every push to the `main` branch.

### Deployment Flow
1. **Push to main** → Triggers GitHub Actions workflow
2. **CI Tests** → TypeScript compilation, linting, format checking, and builds
3. **Netlify Deploy** → Builds and deploys web app to production
4. **Health Check** → Verifies the deployment is accessible

### Production URLs
- **Production Site**: https://productory-powerups.netlify.app
- **Netlify Admin**: https://app.netlify.com/projects/productory-powerups
- **GitHub Actions**: https://github.com/jarmo-productory/gamma-plugin/actions

## Rollback Procedures

### Quick Rollback (< 2 minutes)

If deployment fails or production is broken, use one of these methods:

#### Method 1: Netlify Dashboard Rollback
1. Go to [Netlify Admin](https://app.netlify.com/sites/productory-powerups/deploys)
2. Find the last known good deployment
3. Click "Publish deploy" to rollback

#### Method 2: Git Revert (Recommended)
```bash
# Revert the problematic commit
git revert <commit-hash>
git push origin main

# This triggers automatic re-deployment with the reverted changes
```

#### Method 3: Lock Deployments (Emergency)
```bash
# Stop automatic deployments
netlify api updateSite --data '{"site_id": "9652d33b-9bc4-4c79-8d8f-702cf4dbe787", "build_settings": {"stop_builds": true}}'

# Manually deploy from a specific commit
git checkout <good-commit-hash>
npm run build:web
netlify deploy --prod --dir=packages/web
```

### Environment Variables

Required environment variables for production:
- `NETLIFY_AUTH_TOKEN` (GitHub Secret)
- `NETLIFY_SITE_ID` (Hardcoded: 9652d33b-9bc4-4c79-8d8f-702cf4dbe787)

### Troubleshooting

#### Common Issues
1. **Build Failures**: Check GitHub Actions logs for specific errors
2. **Environment Variables Missing**: Verify secrets in GitHub repository settings
3. **Health Check Fails**: Check if site is accessible at production URL

#### Health Check Script
The deployment includes a health check at `scripts/health-check.sh` that verifies:
- Site responds with 200 status
- Basic functionality is working

#### Manual Testing Checklist
After any deployment:
- [ ] Site loads at https://productory-powerups.netlify.app
- [ ] Authentication flow works (if enabled)
- [ ] API endpoints respond correctly
- [ ] No console errors in browser

### Emergency Contacts
- **DevOps Lead**: Responsible for infrastructure and deployment issues
- **GitHub Repository**: https://github.com/jarmo-productory/gamma-plugin
- **Netlify Support**: For platform-specific issues

### Deployment History
View deployment history at: https://app.netlify.com/sites/productory-powerups/deploys

Each deployment includes:
- Commit hash and message
- Build logs
- Deployment preview
- Rollback capability