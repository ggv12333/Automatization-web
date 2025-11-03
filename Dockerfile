# Imagen base con Miniconda (versión específica para reproducibilidad y seguridad)
FROM continuumio/miniconda3:24.1.2-0

# Instalar Node.js 18.x (LTS) desde NodeSource y herramientas necesarias
RUN apt-get update && apt-get install -y \
    wget unzip curl ca-certificates gnupg \
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

# Crear el entorno Conda, instalar paquetes y dependencias de requirements.txt
RUN conda create -y -n vina python=3.12 \
    && conda install -n vina -c conda-forge numpy swig boost-cpp libboost sphinx sphinx_rtd_theme -y \
    && /bin/bash -c "source activate vina && pip install -r requirements.txt && pip install meeko rdkit" \
    && conda clean -afy

# Descargar e instalar AutoDock Vina desde GitHub (versión x86_64 para Linux)
RUN /bin/bash -c "source activate vina && \
    cd /tmp && \
    wget https://github.com/ccsb-scripps/AutoDock-Vina/releases/download/v1.2.5/vina_1.2.5_linux_x86_64 -O vina && \
    chmod +x vina && \
    mv vina /opt/conda/envs/vina/bin/vina && \
    echo 'Vina instalado:' && \
    /opt/conda/envs/vina/bin/vina --help | head -5"

# Instalar dependencias Node
RUN cd backend && npm install && npm audit fix

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
