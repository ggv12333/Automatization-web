# Preparation Docker usage

This document shows recommended commands to build and run the molecule-preparation image (`Dockerfile.prepare`) included in this repository.

Why use this image
- The image collects scientific packages (RDKit, OpenMM/PDBFixer, Meeko) that are difficult to install on macOS.
- It provides safe fallbacks so `backend/python/prepare_molecules.py` can run even without `reduce`/`scrub.py` installed.

Quick commands

1) Build and run using the helper script (recommended):

```bash
chmod +x docker-run-prepare.sh
./docker-run-prepare.sh
```

2) Force an x86_64 (linux/amd64) build on Apple Silicon (useful when prebuilt binaries are x86):

```bash
./docker-run-prepare.sh --platform linux/amd64
```

3) Manual build + run:

```bash
# build
docker build -f Dockerfile.prepare -t prep-env:latest .

# run
docker run --rm -v "$(pwd)":/work -w /work prep-env:latest \
  bash -lc "python3 backend/python/prepare_molecules.py"
```

Using real `reduce` / `scrub.py` from host

If you have the real MolProbity `reduce` executable or a vendor `scrub.py`, mount them into the container and set the corresponding environment variables. Example:

```bash
# mount host binaries and set env vars so prepare_molecules uses them
docker run --rm -v "$(pwd)":/work -v /host/path/scrub.py:/usr/local/bin/scrub.py \
  -v /host/path/reduce:/usr/local/bin/reduce -w /work \
  -e SCRUB_PY_PATH=/usr/local/bin/scrub.py -e REDUCE_PATH=/usr/local/bin/reduce \
  prep-env:latest bash -lc "python3 backend/python/prepare_molecules.py"
```

Notes
- Building the image can take several minutes, especially when Conda/Mamba packages are installed.
- On Apple Silicon (M1/M2) you may want to use `--platform linux/amd64` when building and running to use x86_64 prebuilt binaries; this runs under emulation and will be slower.
- The `Dockerfile.prepare` image attempts to install the scientific stack; it contains best-effort installs and safe fallbacks so the repository's preparation script runs on most systems.

Troubleshooting
- If builds fail due to memory/time, try increasing Docker's memory and CPU in Docker Desktop preferences.
- If `reduce` or `scrub.py` are required but not present, provide host copies or use the RDKit/PDBFixer fallbacks documented in `backend/python/prepare_molecules.py`.
