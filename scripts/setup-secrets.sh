#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-ledutheo/theo-site}"

echo "→ Secrets GitHub pour $REPO"
echo
echo "Obligatoire :"
echo "  XAI_API_KEY → https://console.x.ai"
echo
echo "Option A — Vercel (si formulaire validé) :"
echo "  VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
echo
echo "Option B — Netlify (souvent plus rapide, compte GitHub OK) :"
echo "  NETLIFY_AUTH_TOKEN → https://app.netlify.com/user/applications"
echo "  NETLIFY_SITE_ID    → Site settings → General"
echo

read -rsp "XAI_API_KEY (xai-...): " XAI_KEY
echo
gh secret set XAI_API_KEY --repo "$REPO" --body "$XAI_KEY"

read -rp "Configurer Vercel aussi ? [o/N] " DO_VERCEL
if [[ "${DO_VERCEL,,}" == "o" ]]; then
  read -rsp "VERCEL_TOKEN: " VTOKEN
  echo
  read -rp "VERCEL_ORG_ID: " VORG
  read -rp "VERCEL_PROJECT_ID: " VPROJ
  gh secret set VERCEL_TOKEN --repo "$REPO" --body "$VTOKEN"
  gh secret set VERCEL_ORG_ID --repo "$REPO" --body "$VORG"
  gh secret set VERCEL_PROJECT_ID --repo "$REPO" --body "$VPROJ"
fi

read -rp "Configurer Netlify aussi ? [O/n] " DO_NETLIFY
if [[ "${DO_NETLIFY,,}" != "n" ]]; then
  read -rsp "NETLIFY_AUTH_TOKEN: " NTOKEN
  echo
  read -rp "NETLIFY_SITE_ID: " NSITE
  gh secret set NETLIFY_AUTH_TOKEN --repo "$REPO" --body "$NTOKEN"
  gh secret set NETLIFY_SITE_ID --repo "$REPO" --body "$NSITE"
fi

echo
echo "✓ Secrets posés."
echo "  Test clé xAI : gh workflow run test-xai.yml --repo $REPO"
echo "  Deploy Netlify: gh workflow run deploy-netlify.yml --repo $REPO"
echo "  Deploy Vercel  : gh workflow run deploy-api.yml --repo $REPO"