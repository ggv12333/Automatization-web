#!/bin/bash
# Script para ejecutar el proyecto fácilmente

echo "🚀 AutoDock Vina Automation - Quick Start"
echo ""

# Verificar si Docker está disponible
if command -v docker &> /dev/null; then
    echo "✅ Docker encontrado"
    echo ""
    echo "¿Cómo quieres ejecutar el proyecto?"
    echo "1) Con Docker (recomendado - todo incluido)"
    echo "2) Localmente (requiere Node.js y Python)"
    echo ""
    read -p "Selecciona opción (1 o 2): " option
    
    if [ "$option" = "1" ]; then
        echo ""
        echo "🐳 Ejecutando con Docker..."
        
        # Verificar si la imagen existe
        if ! docker images | grep -q automatizacion-vina; then
            echo "📦 Construyendo imagen Docker (esto puede tardar 15-20 minutos)..."
            docker build -t automatizacion-vina .
        fi
        
        echo "🚀 Iniciando contenedor..."
        docker run -d -p 8080:8080 --name autodock-vina automatizacion-vina
        
        echo ""
        echo "✅ Servidor iniciado!"
        echo "🌐 Abre tu navegador en: http://localhost:8080"
        echo ""
        echo "Para ver los logs: docker logs -f autodock-vina"
        echo "Para detener: docker stop autodock-vina"
    elif [ "$option" = "2" ]; then
        echo ""
        echo "📦 Ejecutando localmente..."
        
        # Verificar Node.js
        if ! command -v node &> /dev/null; then
            echo "❌ Node.js no encontrado. Por favor instálalo primero."
            exit 1
        fi
        
        # Instalar dependencias si no existen
        if [ ! -d "backend/node_modules" ]; then
            echo "📥 Instalando dependencias de Node.js..."
            cd backend && npm install && cd ..
        fi
        
        echo "🚀 Iniciando servidor..."
        cd backend && node server.js
    else
        echo "❌ Opción inválida"
        exit 1
    fi
else
    echo "⚠️  Docker no encontrado"
    echo ""
    echo "Ejecutando localmente..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js no encontrado. Por favor instálalo primero."
        exit 1
    fi
    
    # Instalar dependencias si no existen
    if [ ! -d "backend/node_modules" ]; then
        echo "📥 Instalando dependencias de Node.js..."
        cd backend && npm install && cd ..
    fi
    
    echo "🚀 Iniciando servidor..."
    cd backend && node server.js
fi
