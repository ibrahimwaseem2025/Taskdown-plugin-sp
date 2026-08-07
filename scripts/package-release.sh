#!/usr/bin/env bash
set -euo pipefail

# Bulk Add Tasks for Super Productivity.
# Author: initialcrow
#
# Prepare a minimal production archive for Super Productivity.
# The final ZIP contains only manifest.json and index.html at the root.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST_FILE="$ROOT_DIR/manifest.json"
INDEX_FILE="$ROOT_DIR/index.html"
DIST_DIR="$ROOT_DIR/dist"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to read manifest.json." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "zip is required to create the production archive." >&2
  exit 1
fi

# Read the package name and version from the plugin manifest.
PLUGIN_ID="$(node -p "JSON.parse(require('fs').readFileSync('$MANIFEST_FILE', 'utf8')).id")"
PLUGIN_VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$MANIFEST_FILE', 'utf8')).version")"

RELEASE_NAME="${PLUGIN_ID}-v${PLUGIN_VERSION}"
RELEASE_DIR="$DIST_DIR/$RELEASE_NAME"
ZIP_FILE="$DIST_DIR/${RELEASE_NAME}.zip"

# Recreate the versioned release folder so stale files are not included.
rm -rf "$RELEASE_DIR" "$ZIP_FILE" "$ROOT_DIR/${RELEASE_NAME}.zip"
mkdir -p "$RELEASE_DIR"

# Only the files required by the iframe runtime are copied.
cp "$MANIFEST_FILE" "$RELEASE_DIR/manifest.json"
cp "$INDEX_FILE" "$RELEASE_DIR/index.html"

# Keep both files at the archive root for direct Super Productivity import.
(
  cd "$RELEASE_DIR"
  zip -q "$ZIP_FILE" manifest.json index.html
)

echo "Prepared $RELEASE_DIR"
echo "Created $ZIP_FILE"
