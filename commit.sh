#!/bin/bash

set -e

echo "------------------------------------"
echo "CrowBO Framework Git Helper"
echo "------------------------------------"

echo "1) Commit & (optionally) create a release"
echo "2) Synchronize latest release tag to current commit"
read -p "Choose an option (1/2): " ACTION

if [[ "$ACTION" == "1" ]]; then

  read -p "Do you want to create a GitHub release after the commit? (y/n): " MAKE_RELEASE

  read -p "Enter commit message: " COMMIT_MSG

  git add .
  git commit -m "$COMMIT_MSG"

  if [[ "$MAKE_RELEASE" == "y" || "$MAKE_RELEASE" == "Y" ]]; then
    LAST_TAG=$(git tag --sort=-creatordate | head -n 1)
    if [[ -n "$LAST_TAG" ]]; then
      echo "Latest existing tag: $LAST_TAG"
    else
      echo "No existing tag found."
    fi
    read -p "Enter release version tag (e.g., v1.0.0): " VERSION

    read -p "Is this a pre-release? (y/n): " IS_PRERELEASE
    PRERELEASE_FLAG=""
    if [[ "$IS_PRERELEASE" == "y" || "$IS_PRERELEASE" == "Y" ]]; then
      PRERELEASE_FLAG="--prerelease"
    fi

    git tag -a "$VERSION" -m "Release $VERSION"
    git push
    git push origin "$VERSION"

    echo "Enter release notes (end with CTRL+D):"
    RELEASE_NOTES=$(cat)

    gh release create "$VERSION" --title "$VERSION" --notes "$RELEASE_NOTES" $PRERELEASE_FLAG

    echo "------------------------------------"
    echo "GitHub release $VERSION created!"
    echo "------------------------------------"
  else
    git push
    echo "✅ Commit pushed. No release created."
  fi

elif [[ "$ACTION" == "2" ]]; then

  LAST_TAG=$(git tag --sort=-creatordate | head -n 1)
  if [[ -z "$LAST_TAG" ]]; then
    echo "❌ No tag found in this repository."
    exit 1
  fi

  echo "Latest tag found: $LAST_TAG"
  read -p "This will move tag '$LAST_TAG' to the current HEAD and update the GitHub release. Continue? (y/n): " CONFIRM

  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Cancelled."
    exit 0
  fi

  git tag -d "$LAST_TAG" 2>/dev/null || true
  git push --delete origin "$LAST_TAG" 2>/dev/null || true

  git tag "$LAST_TAG"
  git push origin "$LAST_TAG"

  echo "✅ Tag '$LAST_TAG' moved to the latest commit and pushed to GitHub."
  echo "ℹ️ The GitHub release for '$LAST_TAG' now points to the latest commit."
  echo "⚠️ If your release includes attached binaries/assets, these will stay the same (only source code changes)."

else
  echo "❌ Invalid option."
  exit 1
fi
