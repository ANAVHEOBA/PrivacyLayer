#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

while IFS= read -r file; do
  while IFS= read -r link; do
    target="${link#*:}"
    [[ -z "$target" ]] && continue
    [[ "$target" =~ ^https?:// ]] && continue
    [[ "$target" =~ ^# ]] && continue

    clean_target="${target%%#*}"
    source_dir="$(dirname "$file")"
    resolved_path="$source_dir/$clean_target"

    if [[ ! -e "$resolved_path" ]]; then
      echo "Broken Markdown link in $file -> $target" >&2
      exit 1
    fi
  done < <(perl -ne 'while (/\[[^\]]+\]\(([^)]+)\)/g) { print "$ARGV:$1\n" }' "$file")
done < <(find "$ROOT_DIR" -name '*.md' -print)

echo "Markdown link check passed."
