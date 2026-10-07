#!/usr/bin/env bash
#
# Puts an uploaded build live on staging.dollartraq.com.
#
#   release.sh <commit sha>
#
# The pipeline has already copied the build to releases/<sha>/. This points
# `dist` (nginx's root) at it in one rename, checks the site serves it, and
# points back at the previous release if not. See docs/staging-deploy.md.

set -euo pipefail

SHA=${1:?usage: release.sh <commit sha>}

APP_DIR=/var/www/dollartraq-frontend
RELEASES="$APP_DIR/releases"
KEEP=3
HOST=staging.dollartraq.com

log() { echo "==> $*"; }

exec 9>/tmp/dollartraq-frontend-deploy.lock
flock -n 9 || { echo "Another frontend deploy is running." >&2; exit 1; }

cd "$APP_DIR"
mkdir -p "$RELEASES"

NEW="$RELEASES/$SHA"
[[ -f "$NEW/index.html" ]] || { echo "No build at $NEW" >&2; exit 1; }

# The first run finds dist as a plain directory, built on the server by hand.
# It becomes the first release, so there is something to roll back to.
if [[ -d dist && ! -L dist ]]; then
    legacy="$RELEASES/manual-$(date +%Y%m%d-%H%M%S)"
    mv dist "$legacy"
    ln -s "$legacy" dist
    log "Kept the hand-built dist as $(basename "$legacy")"
fi

PREVIOUS=$(readlink -f dist || true)

switch_to() {
    ln -sfn "$1" dist.next
    mv -T dist.next dist
}

served_index() {
    curl -fsS --max-time 10 --resolve "$HOST:443:127.0.0.1" "https://$HOST/" || true
}

switch_to "$NEW"

# The live index must be the one just released: same entry script.
expected=$(grep -oE '/assets/index-[^"]+\.js' "$NEW/index.html" | head -n1)

if [[ -n "$expected" ]] && served_index | grep -qF "$expected" \
    && curl -fsS --max-time 10 -o /dev/null --resolve "$HOST:443:127.0.0.1" "https://$HOST$expected"; then
    log "staging.dollartraq.com is on ${SHA:0:8}"
else
    echo "!! ${SHA:0:8} is not being served; putting $(basename "${PREVIOUS:-none}") back" >&2
    [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]] && switch_to "$PREVIOUS"
    exit 1
fi

# Keep the newest few releases; the live one is never removed.
live=$(readlink -f dist)
ls -1dt "$RELEASES"/*/ 2>/dev/null | sed 's#/$##' | tail -n +$((KEEP + 1)) | while read -r old; do
    [[ "$old" == "$live" ]] || rm -rf "$old"
done
