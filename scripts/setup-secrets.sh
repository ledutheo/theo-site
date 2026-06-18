#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-ledutheo/theo-site}"

echo "→ Secrets GitHub pour $REPO"
echo "  Récupère sur console.x.ai (API Keys) et dash.cloudflare.com (API Tokens)"
echo

read -rsp "XAI_API_KEY (xai-...): " XAI_KEY
echo
read -rsp "CLOUDFLARE_API_TOKEN: " CF_TOKEN
echo
read -rp "CLOUDFLARE_ACCOUNT_ID: " CF_ACCOUNT

gh secret set XAI_API_KEY --repo "$REPO" --body "$XAI_KEY"
gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO" --body "$CF_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO" --body "$CF_ACCOUNT"

echo
echo "✓ Secrets posés. Lance le workflow :"
echo "  gh workflow run deploy-worker.yml --repo $REPO"