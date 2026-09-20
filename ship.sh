#!/usr/bin/env bash
# =====================================================================
#  ship.sh — commit, push, and let the pipeline deploy.
#
#      ./ship.sh "fix: correct bid ordering"
#      ./ship.sh                 # uses a timestamped message
#
#  Runs the SAME checks CI runs, before pushing. If something fails you
#  find out here in seconds rather than after a red pipeline run, and
#  nothing broken reaches production.
#
#  Deliberately NOT a file watcher that auto-commits every keystroke:
#  that would push half-finished work straight through to the live
#  Heroku and Vercel deploys, with no chance to review a diff and a real
#  risk of committing a secret by accident. One command is the right
#  amount of friction.
# =====================================================================
set -euo pipefail

cd "$(dirname "$0")"

MSG="${1:-chore: update $(date '+%Y-%m-%d %H:%M')}"

if [ -z "$(git status --porcelain)" ]; then
  echo "Nothing to commit — working tree is clean."
  exit 0
fi

echo "==> Changes to be shipped:"
git status --short
echo

# ---- the same gates CI enforces -------------------------------------
echo "==> Frontend: typecheck"
( cd archintent-frontend && npm run typecheck )

echo "==> Frontend: build"
( cd archintent-frontend && npm run build >/dev/null && rm -rf dist )

echo "==> Backend: PHP lint"
( cd archintent-backend && find app routes config database -name "*.php" -print0 \
    | xargs -0 -n1 php -l >/dev/null )

echo "==> Backend: tests"
( cd archintent-backend && DB_CONNECTION=sqlite DB_DATABASE=':memory:' php artisan test )

echo "==> NLP service: byte-compile"
( cd nlp-service && python -m compileall -q main.py matcher.py \
    || py -m compileall -q main.py matcher.py )

# ---- ship ------------------------------------------------------------
echo
echo "==> All checks passed. Committing and pushing."
git add -A
git commit -m "$MSG"
git push origin main

echo
echo "Pushed. GitHub Actions will now test and deploy:"
echo "  https://github.com/Rabellion/ArchIntent/actions"
