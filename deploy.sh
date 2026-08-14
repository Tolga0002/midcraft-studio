#!/bin/bash
# MidCraft Studio — Deploy auf GitHub Pages
# Aufruf:  ./deploy.sh https://github.com/DEIN-NAME/midcraft-studio.git
set -e
REMOTE="$1"
if [ -z "$REMOTE" ]; then
  echo "So geht's:  ./deploy.sh https://github.com/DEIN-NAME/midcraft-studio.git"
  echo "(Repository vorher auf github.com anlegen — leer, ohne README.)"
  exit 1
fi
cd "$(dirname "$0")"
if [ ! -d .git ]; then
  git init
  git branch -M main
  git remote add origin "$REMOTE"
else
  git remote set-url origin "$REMOTE"
fi
git add -A
git commit -m "MidCraft Studio – Stand $(date +%Y-%m-%d)" || echo "Nichts Neues zu committen."
git push -u origin main
echo
echo "✅ Hochgeladen."
echo "Jetzt auf GitHub:  Settings → Pages → Source: 'Deploy from a branch' → main → / (root) → Save"
echo "Nach ~1 Minute erreichbar unter:"
echo "$REMOTE" | sed -E 's#https://github.com/([^/]+)/([^/.]+)(\.git)?#https://\1.github.io/\2/#'
