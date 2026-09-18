#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_BUMP=false

for arg in "$@"; do
  case $arg in
    --no-bump) SKIP_BUMP=true ;;
    *) echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes detected. Commit or stash first."
  exit 1
fi

pkg_field() { node -p "JSON.parse(require('fs').readFileSync('$1')).$2"; }

process() {
  local dir="$1"
  local pkg="$dir/package.json"
  local name version tag

  name=$(pkg_field "$pkg" name)

  echo ""
  echo "━━━ $name ━━━"
  read -rp "Press Enter to release or Ctrl+C to abort... "

  if [[ "$SKIP_BUMP" == false ]]; then
    node -e "
      const fs = require('fs'), p = '$pkg';
      const obj = JSON.parse(fs.readFileSync(p));
      const [maj, min, pat] = obj.version.split('.').map(Number);
      obj.version = \`\${maj}.\${min}.\${pat + 1}\`;
      fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
    "
  fi

  version=$(pkg_field "$pkg" version)
  tag="$name@$version"

  if [[ "$SKIP_BUMP" == false ]]; then
    git add "$pkg"
    git commit -m "chore: bump $name to $version"
    git push
  fi

  git tag "$tag"
  git push origin "$tag"

  echo "✓ $tag"
}

for dir in "$REPO_ROOT"/libs/*/; do
  [[ -f "$dir/package.json" ]] && process "$dir"
done

for dir in "$REPO_ROOT"/packages/*/; do
  [[ -f "$dir/package.json" ]] && process "$dir"
done

echo ""
echo "Done."
