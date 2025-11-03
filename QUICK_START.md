# 🚀 Guía de Inicio Rápido

Guía paso a paso para ejecutar el proyecto AutoDock Vina Automation.

---

## 📋 Opción 1: Ejecutar con Docker (Recomendado) ⭐

**Ventajas**: Todo está incluido, no necesitas instalar nada más que Docker.

### Paso 1: Verificar Docker
```bash
docker --version
# Si no tienes Docker, instálalo desde: https://www.docker.com/products/docker-desktop
```

### Paso 2: Construir la imagen Docker
```bash
# Desde la raíz del proyecto
cd /Users/gaelgarcia/Desktop/automatizacion-web

# Construir la imagen (toma 15-20 minutos la primera vez)
docker build -t automatizacion-vina .
```

### Paso 3: Ejecutar el contenedor
```bash
# Ejecutar en segundo plano
docker run -d -p 8080:8080 --name autodock-vina automatizacion-vina

# O ejecutar en primer plano (ver logs)
docker run -p 8080:8080 automatizacion-vina
```

### Paso 4: Acceder a la aplicación
Abre tu navegador en: **http://localhost:8080**

### Comandos útiles:
```bash
# Ver logs del contenedor
docker logs autodock-vina

# Detener el contenedor
docker stop autodock-vina

# Iniciar el contenedor (si ya lo detuviste)
docker start autodock-vina

# Eliminar el contenedor
docker rm autodock-vina
```

---

## 📋 Opción 2: Ejecutar Localmente (Sin Docker)

**Requisitos previos**:
- Node.js 18+ 
- Python 3.12+
- AutoDock Vina instalado
- npm instalado

### Paso 1: Instalar dependencias de Node.js
```bash
cd /Users/gaelgarcia/Desktop/automatizacion-web/backend
npm install
```

### Paso 2: Instalar dependencias de Python
```bash
cd /Users/gaelgarcia/Desktop/automatizacion-web
pip install -r requirements.txt
pip install meeko rdkit
```

### Paso 3: Configurar variables de entorno (opcional)
```bash
# En macOS/Linux
export PORT=8080
export PYTHON_PATH=/usr/bin/python3
export VINA_PATH=/usr/local/bin/vina

# En Windows (PowerShell)
$env:PORT=8080
$env:PYTHON_PATH="C:\Python312\python.exe"
$env:VINA_PATH="C:\Program Files\AutoDock Vina\vina.exe"
```

### Paso 4: Iniciar el servidor
```bash
cd /Users/gaelgarcia/Desktop/automatizacion-web/backend
node server.js
```

Deberías ver algo como:
```
✅ Server running at http://0.0.0.0:8080
🌐 Access from your browser: http://localhost:8080
```

### Paso 5: Acceder a la aplicación
Abre tu navegador en: **http://localhost:8080**

---

## 🔧 Solución de Problemas

### Error: "Port 8080 already in use"
```bash
# Encontrar qué está usando el puerto
# macOS/Linux:
lsof -i :8080

# Windows:
netstat -ano | findstr :8080

# Usar otro puerto
export PORT=3000
# O cambiar en Docker:
docker run -p 3000:8080 automatizacion-vina
```

### Error: "Cannot find module"
```bash
# Asegúrate de estar en el directorio correcto
cd backend
npm install
```

### Error: "Python not found"
```bash
# Verificar Python
python3 --version
which python3

# Configurar la ruta correcta
export PYTHON_PATH=$(which python3)
```

### Docker: "Out of memory"
- Aumenta la memoria de Docker Desktop (Settings → Resources → Memory: mínimo 4GB)

---

## 📝 Notas Importantes

1. **Primera ejecución con Docker**: La construcción puede tardar 15-20 minutos porque instala:
   - Miniconda
   - Python 3.12
   - AutoDock Vina
   - Todas las dependencias

2. **Puerto**: Por defecto usa el puerto 8080. Puedes cambiarlo con la variable `PORT`.

3. **Archivos de prueba**: Hay archivos de ejemplo en `test_files/` que puedes usar.

4. **Logs**: Los logs se muestran en la consola. En producción, se pueden guardar en archivos.

---

## ✅ Verificar que Funciona

1. Abre http://localhost:8080
2. Deberías ver la interfaz del wizard
3. Prueba subir archivos de `test_files/`
4. El endpoint `/health` debería responder:
   ```bash
   curl http://localhost:8080/health
   ```

---

## 🆘 ¿Necesitas Ayuda?

- Revisa los logs del servidor
- Verifica que todas las dependencias estén instaladas
- Asegúrate de tener permisos suficientes
- Consulta el README.md para más detalles

---

**¡Listo para usar! 🎉**

