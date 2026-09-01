#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
upstream_root="${OPENCHAMBER_ROOT:-/tmp/opencode/openchamber}"
upstream_ref="${OPENCHAMBER_REF:-2c8ae9adc116376da1e6bb7ac09d8807f1f3b120}"
vendor_root="$repo_root/packages/chamber-ui"
staging_dir="$(mktemp -d)"

cleanup() {
  rm -rf "$staging_dir"
}
trap cleanup EXIT

if [[ ! -d "$upstream_root/.git" ]]; then
  printf 'OpenChamber clone not found: %s\n' "$upstream_root" >&2
  exit 1
fi

git -C "$upstream_root" archive "$upstream_ref" \
  packages/ui/src \
  packages/ui/tsconfig.json \
  packages/web/mobile.html \
  packages/web/src/mobile-main.tsx \
  packages/web/src/runtimeConfig.ts \
  packages/web/src/api \
  LICENSE \
  | tar -x -C "$staging_dir"

if [[ -d "$vendor_root/src/shims" ]]; then
  cp -R "$vendor_root/src/shims" "$staging_dir/local-shims"
fi

rm -rf "$vendor_root/src" "$vendor_root/mobile/api"
rm -f "$vendor_root/tsconfig.json" "$vendor_root/mobile/index.html" "$vendor_root/mobile/mobile-main.tsx" "$vendor_root/mobile/runtimeConfig.ts" "$vendor_root/LICENSE"

mkdir -p "$vendor_root/mobile"
cp -R "$staging_dir/packages/ui/src" "$vendor_root/src"
if [[ -d "$staging_dir/local-shims" ]]; then
  cp -R "$staging_dir/local-shims" "$vendor_root/src/shims"
fi
cp "$staging_dir/packages/ui/tsconfig.json" "$vendor_root/tsconfig.json"
cp "$staging_dir/packages/web/mobile.html" "$vendor_root/mobile/index.html"
cp "$staging_dir/packages/web/src/mobile-main.tsx" "$vendor_root/mobile/mobile-main.tsx"
cp "$staging_dir/packages/web/src/runtimeConfig.ts" "$vendor_root/mobile/runtimeConfig.ts"
cp -R "$staging_dir/packages/web/src/api" "$vendor_root/mobile/api"
rm -f "$vendor_root/mobile/api"/*.test.ts
cp "$staging_dir/LICENSE" "$vendor_root/LICENSE"

printf 'Re-copied OpenChamber %s into %s\n' "$upstream_ref" "$vendor_root"
printf 'Re-apply all // ANEMOS-PATCH markers from the migration checklist before committing.\n'
