#!/bin/bash
set -euo pipefail

if [ -n "${VERSION:-}" ]; then
  echo "$VERSION"
elif version=$(git describe --tags --exact-match HEAD 2>/dev/null); then
  echo "$version"
elif version=$(git describe --tags 2>/dev/null); then
  echo "$version"
else
  echo "dev-$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
fi
