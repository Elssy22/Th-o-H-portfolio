#!/usr/bin/env bash
# Commande de build utilisée par Vercel (voir vercel.json).
#
# - Production + clé Convex présente : déploie les fonctions Convex, puis build le site.
#   Si Convex échoue, le build échoue : le site ne part pas en ligne
#   avec un back-end désynchronisé.
# - Sinon (previews, ou clé pas encore configurée) : build du site seul,
#   comme avant.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ] && [ -n "${CONVEX_DEPLOY_KEY:-}" ]; then
  echo "▶ Production : déploiement Convex puis build Next.js"
  npx convex deploy --cmd 'npm run build'
else
  if [ "${VERCEL_ENV:-}" = "production" ]; then
    echo "⚠ CONVEX_DEPLOY_KEY absente : Convex n'est PAS déployé, build du site seul."
  fi
  npm run build
fi
