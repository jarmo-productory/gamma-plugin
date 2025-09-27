#!/bin/bash

# Netlify Deployment Rollback Script
# DevOps Infrastructure - Emergency Rollback Procedures

set -euo pipefail

SITE_ID="${NETLIFY_SITE_ID:-9652d33b-9bc4-4c79-8d8f-702cf4dbe787}"
SITE_URL="${SITE_URL:-https://productory-powerups.netlify.app}"

echo "🚨 Netlify Deployment Rollback Tool"
echo "Site ID: $SITE_ID"
echo "Site URL: $SITE_URL"
echo ""

# Check if netlify CLI is available
if ! command -v netlify >/dev/null 2>&1; then
    echo "❌ ERROR: Netlify CLI not found. Install with: npm install -g netlify-cli"
    exit 1
fi

# List recent deployments
echo "📋 Recent deployments:"
netlify api listSiteDeploys --data="{\"site_id\":\"$SITE_ID\"}" | jq -r '.[] | select(.state == "ready") | "\(.id[0:8]) \(.created_at) \(.branch) \(.commit_ref[0:8]) \(.deploy_url)"' | head -10

echo ""
echo "🔍 Current production deployment:"
CURRENT_DEPLOY=$(netlify api getSite --data="{\"site_id\":\"$SITE_ID\"}" | jq -r '.published_deploy.id')
netlify api getDeploy --data="{\"deploy_id\":\"$CURRENT_DEPLOY\"}" | jq -r '"Current: \(.id[0:8]) \(.created_at) \(.branch) \(.commit_ref[0:8])"'

echo ""
echo "Available rollback options:"
echo "1. Rollback to previous successful deployment"
echo "2. Rollback to specific deployment ID"
echo "3. Rollback to specific commit"
echo "4. Cancel (exit)"

read -p "Select option (1-4): " choice

case $choice in
    1)
        echo "🔄 Rolling back to previous deployment..."
        PREVIOUS_DEPLOY=$(netlify api listSiteDeploys --data="{\"site_id\":\"$SITE_ID\"}" | jq -r '.[] | select(.state == "ready" and .published_at != null) | .id' | sed -n '2p')

        if [[ -z "$PREVIOUS_DEPLOY" ]]; then
            echo "❌ ERROR: No previous deployment found"
            exit 1
        fi

        echo "Previous deployment ID: $PREVIOUS_DEPLOY"
        netlify api restoreSiteDeploy --data="{\"site_id\":\"$SITE_ID\",\"deploy_id\":\"$PREVIOUS_DEPLOY\"}"
        ;;

    2)
        read -p "Enter deployment ID (8+ characters): " DEPLOY_ID

        if [[ ${#DEPLOY_ID} -lt 8 ]]; then
            echo "❌ ERROR: Deployment ID too short"
            exit 1
        fi

        echo "🔄 Rolling back to deployment: $DEPLOY_ID"
        netlify api restoreSiteDeploy --data="{\"site_id\":\"$SITE_ID\",\"deploy_id\":\"$DEPLOY_ID\"}"
        ;;

    3)
        read -p "Enter commit SHA (7+ characters): " COMMIT_SHA

        if [[ ${#COMMIT_SHA} -lt 7 ]]; then
            echo "❌ ERROR: Commit SHA too short"
            exit 1
        fi

        echo "🔍 Finding deployment for commit: $COMMIT_SHA"
        DEPLOY_FOR_COMMIT=$(netlify api listSiteDeploys --data="{\"site_id\":\"$SITE_ID\"}" | jq -r --arg commit "$COMMIT_SHA" '.[] | select(.commit_ref | startswith($commit)) | .id' | head -1)

        if [[ -z "$DEPLOY_FOR_COMMIT" ]]; then
            echo "❌ ERROR: No deployment found for commit $COMMIT_SHA"
            exit 1
        fi

        echo "🔄 Rolling back to deployment: $DEPLOY_FOR_COMMIT (commit: $COMMIT_SHA)"
        netlify api restoreSiteDeploy --data="{\"site_id\":\"$SITE_ID\",\"deploy_id\":\"$DEPLOY_FOR_COMMIT\"}"
        ;;

    4)
        echo "❌ Rollback cancelled"
        exit 0
        ;;

    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
sleep 10

# Verify rollback
echo "🔍 Verifying rollback..."
NEW_CURRENT=$(netlify api getSite --data="{\"site_id\":\"$SITE_ID\"}" | jq -r '.published_deploy.id')
netlify api getDeploy --data="{\"deploy_id\":\"$NEW_CURRENT\"}" | jq -r '"New current: \(.id[0:8]) \(.created_at) \(.branch) \(.commit_ref[0:8])"'

# Health check after rollback
echo "🏥 Running post-rollback health check..."
if curl -f -s "$SITE_URL/api/health" >/dev/null; then
    echo "✅ Health check passed - site is responding"
else
    echo "⚠️  WARNING: Health check failed - site may have issues"
fi

echo ""
echo "🎉 Rollback complete!"
echo "🌐 Site URL: $SITE_URL"
echo "📊 Admin URL: https://app.netlify.com/sites/productory-powerups"
echo ""
echo "📋 Next steps:"
echo "1. Monitor site performance and error rates"
echo "2. Investigate root cause of original deployment issue"
echo "3. Prepare fixed deployment for next release"
echo "4. Update incident response documentation if needed"