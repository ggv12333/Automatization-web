# 🔬 Sistema de Preparación de Moléculas

Documentación completa del sistema de preparación de proteínas y ligandos para AutoDock Vina.

---

## 📋 Resumen

El sistema actualmente **prepara moléculas automáticamente** en el modo avanzado, convirtiendo diferentes formatos a PDBQT (formato requerido por AutoDock Vina).

---

## 🔄 Flujo de Preparación

### **Proteínas (Receptores)**

#### 1. **Desde Código PDB**
```
Usuario ingresa código PDB (ej: 7E2Y)
  ↓
download-pdb 7E2Y /tmp/uploads
  ↓
1. Descarga PDB desde RCSB
2. Convierte PDB → PDBQT usando mk_prepare_receptor.py
  ↓
Resultado: 7E2Y_receptor.pdbqt
```

#### 2. **Desde Archivo PDB**
```
Usuario sube archivo .pdb
  ↓
prepare-receptor file.pdb /tmp/uploads
  ↓
Convierte PDB → PDBQT usando mk_prepare_receptor.py
  ↓
Resultado: file_receptor.pdbqt
```

#### 3. **Desde Archivo PDBQT**
```
Usuario sube archivo .pdbqt
  ↓
Se usa directamente (sin conversión)
```

---

### **Ligandos**

#### 1. **Desde SMILES**
```
Usuario sube archivo .smi o .smiles
  ↓
prepare-ligands {"smiles": ["file.smi"], ...} /tmp/ligands
  ↓
1. Lee SMILES del archivo
2. Convierte SMILES → Molécula 3D (RDKit)
3. Añade hidrógenos y optimiza geometría
4. Convierte → PDBQT usando Meeko
  ↓
Resultado: ligand_1.pdbqt, ligand_2.pdbqt, ...
```

#### 2. **Desde SDF**
```
Usuario sube archivo .sdf
  ↓
prepare-ligands {"sdf": ["file.sdf"], ...} /tmp/ligands
  ↓
Convierte SDF → PDBQT usando mk_prepare_ligand.py
  ↓
Resultado: file.pdbqt
```

#### 3. **Desde MOL2**
```
Usuario sube archivo .mol2
  ↓
prepare-ligands {"mol2": ["file.mol2"], ...} /tmp/ligands
  ↓
Convierte MOL2 → PDBQT usando mk_prepare_ligand.py
  ↓
Resultado: file.pdbqt
```

#### 4. **Desde PDBQT**
```
Usuario sube archivo .pdbqt
  ↓
prepare-ligands {"pdbqt": ["file.pdbqt"], ...} /tmp/ligands
  ↓
Copia directamente (sin conversión)
  ↓
Resultado: file.pdbqt
```

---

## 🛠️ Herramientas Utilizadas

### **Para Proteínas:**
- **mk_prepare_receptor.py** (Meeko)
  - Convierte archivos PDB a formato PDBQT
  - Añade átomos de hidrógeno si faltan
  - Calcula cargas usando AutoDockTools

### **Para Ligandos:**
- **mk_prepare_ligand.py** (Meeko)
  - Convierte SDF, MOL2, PDB a PDBQT
  - Maneja diferentes formatos de entrada

- **RDKit + Meeko** (para SMILES)
  - RDKit: Convierte SMILES a molécula 3D
  - Meeko: Convierte molécula → PDBQT
  - Optimiza geometría con MMFF

---

## 📝 Formatos Soportados

### **Entrada de Proteínas:**
- ✅ **PDBQT** - Usado directamente
- ✅ **PDB** - Convertido automáticamente
- ✅ **Código PDB** - Descargado y convertido

### **Entrada de Ligandos:**
- ✅ **PDBQT** - Usado directamente
- ✅ **SDF** - Convertido automáticamente
- ✅ **MOL2** - Convertido automáticamente
- ✅ **SMILES** - Convertido automáticamente (requiere RDKit + Meeko)

---

## 🔧 Implementación Técnica

### **Script Python (`prepare_molecules.py`)**

El script acepta comandos desde línea de comandos:

```bash
# Descargar y preparar PDB
python prepare_molecules.py download-pdb 7E2Y /tmp/uploads

# Preparar receptor desde archivo PDB
python prepare_molecules.py prepare-receptor file.pdb /tmp/uploads

# Preparar ligandos desde múltiples formatos
python prepare_molecules.py prepare-ligands '{"smiles":["file.smi"],"sdf":["file.sdf"]}' /tmp/ligands
```

### **Integración con Node.js**

En el flujo `/docking/run`:

1. **Modo Avanzado activado:**
   - Si hay códigos PDB → Descarga y prepara
   - Si hay archivos PDB → Convierte a PDBQT
   - Si hay ligandos (SMILES/SDF/MOL2) → Convierte a PDBQT
   - Archivos PDBQT se copian directamente

2. **Los archivos preparados se usan automáticamente** en el docking

---

## ⚠️ Requisitos y Dependencias

### **Obligatorias:**
- Python 3.12+
- Meeko (`mk_prepare_receptor.py`, `mk_prepare_ligand.py`)
- AutoDockTools (para cálculos de carga)

### **Opcionales pero Recomendadas:**
- **RDKit**: Para conversión de SMILES
- **Meeko Python API**: Para mejor manejo de SMILES

### **Instalación:**
```bash
pip install meeko rdkit
# Meeko instala los scripts mk_prepare_*.py
```

---

## 🐛 Solución de Problemas

### **Error: "Meeko not available"**
```bash
# Instalar Meeko
pip install meeko
# O con conda:
conda install -c conda-forge meeko
```

### **Error: "RDKit not available"**
```bash
# SMILES conversion requiere RDKit
pip install rdkit
# O con conda (mejor opción):
conda install -c conda-forge rdkit
```

### **Error: "mk_prepare_receptor.py not found"**
- Asegúrate de que Meeko esté instalado y en el PATH
- O especifica la ruta completa en el código

### **Conversión SMILES falla**
- Verifica que el SMILES sea válido
- Algunas moléculas pueden requerir optimización manual
- Revisa los logs para errores específicos

---

## 📊 Estado Actual

### ✅ **Funcional:**
- Descarga de PDB desde RCSB
- Conversión PDB → PDBQT (receptores)
- Conversión SDF/MOL2 → PDBQT (ligandos)
- Conversión SMILES → PDBQT (si RDKit está disponible)
- Copia directa de archivos PDBQT
- Integración completa en flujo de docking

### 🔄 **Mejoras Futuras:**
- Validación más robusta de formatos
- Soporte para archivos multi-molécula SDF
- Optimización de geometría 3D mejorada
- Caché de conversiones para evitar reprocesar

---

## 📖 Referencias

- **AutoDock Vina**: https://vina.scripps.edu/
- **Meeko**: https://github.com/forlilab/Meeko
- **RDKit**: https://www.rdkit.org/
- **RCSB PDB**: https://www.rcsb.org/

---

## 🔍 Cómo Probar

```bash
# Probar descarga de PDB
python backend/python/prepare_molecules.py download-pdb 7E2Y /tmp/test

# Probar conversión de ligando
python backend/python/prepare_molecules.py prepare-ligands '{"sdf":["test.sdf"]}' /tmp/test

# Verificar archivos generados
ls -lh /tmp/test/*.pdbqt
```

---

**Última actualización**: Ahora completamente funcional ✅

