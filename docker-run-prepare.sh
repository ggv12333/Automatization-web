#!/usr/bin/env bash
# Helper to build and run the preparation image (platform-aware)
set -euo pipefail

IMAGE_NAME=prep-env:latest
PLATFORM=""

usage() {
	cat <<EOF
Usage: $0 [--platform linux/amd64] [--help]

Builds the preparer image from Dockerfile.prepare and runs
`backend/python/prepare_molecules.py` inside a container mounting
the current repository at /work.

Examples:
	# default build (host platform)
	$0

	# force building for x86_64 (useful on Apple Silicon)
	$0 --platform linux/amd64

To make the container use real tools from the host, mount them and
set env vars when running the container (see PREPARATION_DOCKER.md).
EOF
}

# Simple arg parsing
while [[ $# -gt 0 ]]; do
	case "$1" in
		--platform)
			if [[ -z "${2-}" ]]; then echo "Missing value for --platform"; exit 2; fi
			PLATFORM="--platform=$2"
			shift 2
			;;
		--platform=*)
			PLATFORM="--platform=${1#*=}"
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

echo "Building Docker image ${IMAGE_NAME} ${PLATFORM} (this may take several minutes)..."
docker build ${PLATFORM} -f Dockerfile.prepare -t ${IMAGE_NAME} .

echo "Running preparer (will mount current repo at /work)"
mkdir -p /tmp/prep_out || true

# Run the preparer. Users can provide SCRUB_PY_PATH and REDUCE_PATH via -e flags
# or mount host binaries into the container if they want the real tools used.
docker run --rm -v "$(pwd)":/work -w /work ${IMAGE_NAME} \
	bash -lc "python3 backend/python/prepare_molecules.py || true"

echo "Done. To run interactively or provide real tools, try examples in PREPARATION_DOCKER.md"
