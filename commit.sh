#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "Bulk Add Tasks — commit and publish"
read -r -p "Publish a new release after this commit? (y/n): " MAKE_RELEASE
read -r -p "Commit message: " COMMIT_MSG
if [[ -z "$COMMIT_MSG" ]]; then
  echo "A commit message is required." >&2
  exit 1
fi

BRANCH="$(git symbolic-ref --short HEAD)"
NOTES_FILE=""
trap 'if [[ -n "$NOTES_FILE" ]]; then rm -f "$NOTES_FILE"; fi' EXIT

if [[ "$MAKE_RELEASE" == "y" || "$MAKE_RELEASE" == "Y" ]]; then
  VERSION="$(node -p 'JSON.parse(require("fs").readFileSync("manifest.json", "utf8")).version')"
  TAG="v${VERSION}"
  git check-ref-format "refs/tags/$TAG"

  # Published tags are immutable. Fail before committing if this version exists.
  if git show-ref --verify --quiet "refs/tags/$TAG"; then
    echo "$TAG already exists locally. Choose a new version in manifest.json." >&2
    exit 1
  fi
  if git ls-remote --exit-code --tags origin "refs/tags/$TAG" > /dev/null; then
    echo "$TAG already exists on origin. Choose a new version in manifest.json." >&2
    exit 1
  else
    REMOTE_STATUS=$?
    if [[ "$REMOTE_STATUS" != "2" ]]; then
      echo "Could not check remote tags. Nothing was committed or published." >&2
      exit "$REMOTE_STATUS"
    fi
  fi

  node --test tests/*.test.cjs
  bash scripts/package-release.sh
  NOTES_FILE="$(mktemp)"
  echo "Release notes for $TAG (finish with Ctrl+D):"
  cat > "$NOTES_FILE"
  if [[ ! -s "$NOTES_FILE" ]]; then
    echo "Release notes are required." >&2
    exit 1
  fi
fi

git add .
git commit -m "$COMMIT_MSG"

if [[ "$MAKE_RELEASE" == "y" || "$MAKE_RELEASE" == "Y" ]]; then
  git tag -a "$TAG" -F "$NOTES_FILE"
  git push --atomic origin "$BRANCH" "refs/tags/$TAG"
  echo "Pushed $TAG. GitHub Actions will test, build, and publish the release ZIP."
else
  git push origin "$BRANCH"
fi
