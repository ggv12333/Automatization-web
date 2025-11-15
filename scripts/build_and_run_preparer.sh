#!/usr/bin/env bash
# Build and run helper for the preparer image
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE_NAME=prep-env:latest
PLATFORM=""
BUILD_APP=false

usage(){
  cat <<EOF
Usage: $0 [--platform linux/amd64] [--app]

Options:
  --platform <platform>   Pass --platform to docker build (e.g. linux/amd64)
  --app                   Also build the full application image (Dockerfile)
  -h, --help              Show this help

This script builds the preparer image from Dockerfile.prepare and then
runs `backend/python/prepare_molecules.py` inside a container mounting
the repository at /work.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="--platform=$2"
      shift 2
      ;;
    --platform=*)
      PLATFORM="--platform=${1#*=}"
      shift
      ;;
    --app)
      BUILD_APP=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

echo "[build_and_run_preparer] repo root: $REPO_ROOT"
echo "[build_and_run_preparer] building preparer image: ${IMAGE_NAME} ${PLATFORM}"
docker build ${PLATFORM} -f "$REPO_ROOT/Dockerfile.prepare" -t ${IMAGE_NAME} "$REPO_ROOT"

if [ "$BUILD_APP" = true ]; then
  echo "[build_and_run_preparer] building application image (Dockerfile)"
  docker build ${PLATFORM} -f "$REPO_ROOT/Dockerfile" -t automatizacion-web:latest "$REPO_ROOT"
fi

echo "[build_and_run_preparer] running preparer (mounting repo at /work)"
docker run --rm -v "$REPO_ROOT":/work -w /work ${IMAGE_NAME} \
  bash -lc "python3 backend/python/prepare_molecules.py || true"

echo "[build_and_run_preparer] done"
