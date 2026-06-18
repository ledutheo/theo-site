#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-ledutheo/theo-site}"

echo "→ Secrets GitHub pour $REPO (API Grok via Vercel)"
echo
echo "  1. XAI_API_KEY     → https://console.x.ai (clé API, pas le login Grok CLI)"
echo "  2. VERCEL_TOKEN    → https://vercel.com/account/tokens"
echo "  3. VERCEL_ORG_ID   → Vercel → Settings → General (Team/Personal ID)"
echo "  4. VERCEL_PROJECT_ID → après 'vercel link' dans ce repo, ou dashboard projet"
echo

read -rsp "XAI_API_KEY (xai-...): " XAI_KEY
echo
read -rsp "VERCEL_TOKEN: " VTOKEN
echo
read -rp "VERCEL_ORG_ID: " VORG
read -rp "VERCEL_PROJECT_ID: " VPROJ

gh secret set XAI_API_KEY --repo "$REPO" --body "$XAI_KEY"
gh secret set VERCEL_TOKEN --repo "$REPO" --body "$VTOKEN"
gh secret set VERCEL_ORG_ID --repo "$REPO" --body "$VORG"
gh secret set VERCEL_PROJECT_ID --repo "$REPO" --body "$VPROJ"

echo
echo "✓ Secrets posés. Déploie l'API :"
echo "  gh workflow run deploy-api.yml --repo $REPO"