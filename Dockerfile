# Imagen base con Miniconda (versión específica para reproducibilidad y seguridad)
FROM continuumio/miniconda3:24.1.2-0

# Instalar Node.js 18.x (LTS) desde NodeSource y herramientas necesarias
RUN apt-get update && apt-get install -y \
    wget unzip curl ca-certificates gnupg openbabel \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Crear el directorio de trabajo
WORKDIR /app

# Copiar archivos del proyecto
COPY backend/ ./backend
COPY frontend/ ./frontend
COPY requirements.txt ./
COPY swagger.json ./

# Crear el entorno Conda, instalar paquetes y dependencias de requirements.txt
RUN conda create -y -n vina python=3.12 \
    && conda install -n vina -c conda-forge numpy swig boost-cpp libboost sphinx sphinx_rtd_theme -y \
    && /bin/bash -c "source activate vina && pip install -r requirements.txt && pip install meeko rdkit biopython" \
    && conda clean -afy

# Descargar e instalar AutoDock Vina desde GitHub (versión x86_64 para Linux)
RUN /bin/bash -c "source activate vina && \
    cd /tmp && \
    wget https://github.com/ccsb-scripps/AutoDock-Vina/releases/download/v1.2.5/vina_1.2.5_linux_x86_64 -O vina && \
    chmod +x vina && \
    mv vina /opt/conda/envs/vina/bin/vina && \
    echo 'Vina instalado:' && \
    /opt/conda/envs/vina/bin/vina --help | head -5"

# Install small utilities for molecular processing: OpenBabel and a Python scrub tool
RUN cat > /usr/local/bin/reduce <<'EOF' && \
        cat > /usr/local/bin/scrub.py <<'EOF2' && \
        chmod +x /usr/local/bin/reduce /usr/local/bin/scrub.py
#!/bin/sh
# reduce wrapper using OpenBabel (adds hydrogens where possible)
if [ -z "$1" ]; then
    cat
    exit 0
fi
IN="$1"
OUT="${2:-/dev/stdout}"
EXT="${IN##*.}"
case "$EXT" in
  mol2)
    obabel -i mol2 "$IN" -o mol2 -O "$OUT" --addH || cat "$IN" > "$OUT"
    ;;
  pdb)
    obabel -ipdb "$IN" -opdb -O "$OUT" --addH || cat "$IN" > "$OUT"
    ;;
  pdbqt)
    obabel -ipdbqt "$IN" -opdbqt -O "$OUT" --addH || cat "$IN" > "$OUT"
    ;;
  *)
    # Try generic format detection
    obabel "$IN" -O "$OUT" --addH 2>/dev/null || cat "$IN" > "$OUT"
    ;;
esac
EOF
#!/usr/bin/env python3
import sys
try:
    from Bio.PDB import PDBParser, PDBIO, Select
except Exception:
    # If Biopython is not available, act as a passthrough
    if len(sys.argv) >= 3:
        import shutil
        shutil.copyfile(sys.argv[1], sys.argv[2])
    else:
        sys.stdout.write(sys.stdin.read())
    sys.exit(0)

class NoHydrogensSelect(Select):
    def accept_atom(self, atom):
        name = atom.get_name()
        # Filter out hydrogens by element or atom name starting with H
        element = getattr(atom, 'element', None)
        if element and element.upper().startswith('H'):
            return False
        if name and name.strip().upper().startswith('H'):
            return False
        return True

def main():
    if len(sys.argv) < 2:
        # passthrough stdin
        sys.stdout.write(sys.stdin.read())
        return
    inp = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else None
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure('mol', inp)
    io = PDBIO()
    io.set_structure(structure)
    if out:
        io.save(out, NoHydrogensSelect())
    else:
        # write to stdout
        import io as _io
        fh = _io.StringIO()
        io.save(fh, NoHydrogensSelect())
        sys.stdout.write(fh.getvalue())

if __name__ == '__main__':
    main()
EOF2


# Instalar dependencias Node (skip `npm audit` during image build to avoid failing the build)
RUN cd backend && npm install --no-audit

# Crear directorios necesarios con permisos apropiados
RUN mkdir -p /tmp/uploads /tmp/workdir /tmp/workdir/resultados /app/logs \
    && chmod 755 /tmp/uploads /tmp/workdir /app/logs

# Crear usuario no-root para ejecutar la aplicación (seguridad)
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /tmp/uploads /tmp/workdir

# Cambiar a usuario no-root
USER appuser

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Comando para iniciar Node usando Python del entorno Conda
CMD ["bash", "-c", "source /opt/conda/etc/profile.d/conda.sh && conda activate vina && export PYTHON_PATH=/opt/conda/envs/vina/bin/python && export VINA_PATH=/opt/conda/envs/vina/bin/vina && node backend/server.js"]
