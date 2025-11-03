#!/bin/bash
# ============================================
# Comandos para subir el proyecto a GitHub
# ============================================
#
# INSTRUCCIONES:
# 1. Reemplaza TU_USUARIO con tu nombre de usuario de GitHub
# 2. Reemplaza TU_REPOSITORIO con el nombre del repositorio que creaste
# 3. Ejecuta este script o copia los comandos uno por uno
#
# Ejemplo:
#   Usuario: gaelgarcia
#   Repositorio: automatizacion-web
#   URL sería: https://github.com/gaelgarcia/automatizacion-web.git
#

# ============================================
# PASO 1: Agregar el repositorio remoto
# ============================================
echo "🔗 Conectando con GitHub..."
git remote add origin https://github.com/ggv12333/Automatization-web.git

# ============================================
# PASO 2: Verificar que se agregó correctamente
# ============================================
echo "✅ Verificando conexión..."
git remote -v

# ============================================
# PASO 3: Subir el código (primera vez)
# ============================================
echo "📤 Subiendo código a GitHub..."
git push -u origin main

# ============================================
# NOTAS IMPORTANTES:
# ============================================
# - La primera vez que hagas push, GitHub te pedirá autenticación
# - Usa tu nombre de usuario de GitHub
# - Para la contraseña, usa un Personal Access Token (NO tu contraseña normal)
#
# Cómo crear un Personal Access Token:
# 1. Ve a: https://github.com/settings/tokens
# 2. Click en "Generate new token (classic)"
# 3. Dale un nombre: "Automatizacion Web"
# 4. Selecciona el scope "repo" (marcar todo lo de repo)
# 5. Click en "Generate token"
# 6. COPIA EL TOKEN (solo lo verás una vez)
# 7. Usa ese token como contraseña cuando GitHub te lo pida
#
# ============================================
# COMANDOS PARA ACTUALIZACIONES FUTURAS:
# ============================================
# git add .
# git commit -m "Descripción de los cambios"
# git push
#

