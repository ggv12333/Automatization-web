#!/usr/bin/env python3
import csv
from datetime import datetime
from pathlib import Path
import subprocess
import pandas as pd
import sys
import shutil
import concurrent.futures
import os
import json

# ----------------------
# Configuración de rutas
# ----------------------
WORKDIR = os.environ.get("WORKDIR", "/app/workdir")

# ----------------------
# Leer configuración pasada desde Node.js como JSON
# ----------------------
CONFIGS = []
if len(sys.argv) > 1:
    try:
        config_json = json.loads(sys.argv[1])

        # Soportar tanto un objeto único como un array de objetos
        if isinstance(config_json, list):
            configs_list = config_json
        else:
            configs_list = [config_json]

        for cfg in configs_list:
            config = {
                'receptor': cfg['receptor'],
                'ligand_dir': cfg['ligand_dir'],
                'output_base': cfg['output_base'],
                'center_x': str(cfg.get('center_x', '0')),
                'center_y': str(cfg.get('center_y', '0')),
                'center_z': str(cfg.get('center_z', '0')),
                'size_x': str(cfg.get('size_x', '20')),
                'size_y': str(cfg.get('size_y', '20')),
                'size_z': str(cfg.get('size_z', '20')),
                'exhaustiveness': str(cfg.get('exhaustiveness', '8')),
                'parallel_workers': cfg.get('parallel_workers', None)
            }
            CONFIGS.append(config)

        # Mantener CONFIG para compatibilidad
        CONFIG = CONFIGS[0] if CONFIGS else {}
    except Exception as e:
        sys.exit(f"Error parsing JSON config from Node.js: {e}")
else:
    sys.exit("No se recibió configuración desde Node.js")

# ----------------------
# Funciones del script
# ----------------------
def actualizar_historial(parametros, estado, observaciones):
    historial_dir = Path(WORKDIR) / "historial_ejecuciones"
    historial_dir.mkdir(parents=True, exist_ok=True)
    historial_file = historial_dir / "historial.csv"
    encabezados = [
        "fecha_inicio", "hora_inicio", "fecha_fin", "hora_fin",
        "receptor", "ligandos_procesados", "exhaustividad",
        "parallel_workers", "output_dir", "estado", "observaciones"
    ]
    escribir_encabezados = not historial_file.exists()
    ahora = datetime.now()
    fecha_fin = ahora.strftime("%Y-%m-%d")
    hora_fin = ahora.strftime("%H:%M:%S")
    fila = {
        "fecha_inicio": parametros.get("fecha_inicio_fecha", ""),
        "hora_inicio": parametros.get("hora_inicio_hora", ""),
        "fecha_fin": fecha_fin,
        "hora_fin": hora_fin,
        "receptor": parametros.get("receptor", ""),
        "ligandos_procesados": parametros.get("ligandos_procesados", ""),
        "exhaustividad": parametros.get("exhaustividad", ""),
        "parallel_workers": parametros.get("parallel_workers", ""),
        "output_dir": parametros.get("output_dir", ""),
        "estado": estado,
        "observaciones": observaciones
    }
    with open(historial_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=encabezados)
        if escribir_encabezados:
            writer.writeheader()
        writer.writerow(fila)

def parse_config(config_dict):
    """
    Recibe un diccionario de configuración (desde Node.js) y lo valida/formatea.
    """
    config = dict(config_dict)
    # Validación numérica
    float_keys = ['center_x', 'center_y', 'center_z', 'size_x', 'size_y', 'size_z']
    for key in float_keys:
        val = config.get(key)
        try:
            val_f = float(val)
        except Exception:
            sys.exit(f"Error: El parámetro '{key}' debe ser un valor numérico (valor recibido: {val})")
        config[key] = str(val_f)

    ex = config.get('exhaustiveness')
    try:
        ex_int = int(ex)
    except Exception:
        sys.exit(f"Error: El parámetro 'exhaustiveness' debe ser un entero (valor recibido: {ex})")
    config['exhaustiveness'] = str(ex_int)

    pw = config.get('parallel_workers')
    if pw is not None and pw != '' and pw != "None":
        try:
            pw_int = int(pw)
        except Exception:
            sys.exit(f"Error: El parámetro 'parallel_workers' debe ser un entero (valor recibido: {pw})")
        config['parallel_workers'] = pw_int
    else:
        config['parallel_workers'] = None

    # Convertir rutas a absolutas
    config['receptor'] = str(Path(config['receptor']).resolve())
    config['ligand_dir'] = str(Path(config['ligand_dir']).resolve())
    config['output_base'] = str(Path(config['output_base']).resolve())

    return config

def find_configs(configs_dir):
    configs_dir = Path(configs_dir)
    if not configs_dir.exists() or not configs_dir.is_dir():
        return []
    return sorted([str(f) for f in configs_dir.glob("*.txt")])

def validate_paths(config):
    errors = []
    receptor_path = Path(config['receptor'])
    ligand_dir_path = Path(config['ligand_dir'])
    output_base_path = Path(config['output_base'])
    if not receptor_path.exists():
        errors.append(f"Archivo receptor no encontrado (ruta absoluta): {receptor_path}")
    if not ligand_dir_path.is_dir():
        errors.append(f"Directorio de ligandos no encontrado (ruta absoluta): {ligand_dir_path}")
    else:
        ligands = list(ligand_dir_path.glob('*.pdbqt'))
        if not ligands:
            errors.append(f"No hay archivos PDBQT en (ruta absoluta): {ligand_dir_path}")
    if not output_base_path.exists():
        try:
            output_base_path.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            errors.append(f"No se pudo crear el directorio de salida: {output_base_path} ({e})")

    # Validar que Vina esté disponible
    vina_exec = os.environ.get("VINA_PATH", "vina")
    try:
        # First try --version for newer vina builds, fall back to --help
        try:
            result = subprocess.run([vina_exec, "--version"], capture_output=True, text=True, timeout=5)
        except Exception:
            result = subprocess.run([vina_exec, "--help"], capture_output=True, text=True, timeout=5)

        if result.returncode != 0:
            errors.append(f"AutoDock Vina no está disponible en: {vina_exec}")
        else:
            # Try to detect version (if present) and warn if older than 1.2
            out = (result.stdout or result.stderr or "").strip()
            import re
            m = re.search(r"[Vv]ina\s*([0-9]+\.[0-9]+)", out)
            if m:
                try:
                    ver = float(m.group(1))
                    if ver < 1.2:
                        print(f"⚠️  Detected AutoDock Vina version {ver}. Consider upgrading to the latest Vina (>=1.2) for improved performance.")
                except Exception:
                    pass
    except FileNotFoundError:
        errors.append(f"AutoDock Vina no encontrado en: {vina_exec}")
    except Exception as e:
        errors.append(f"Error verificando AutoDock Vina: {e}")

    if errors:
        sys.exit("\n".join(["\nERRORES:"] + errors))

# ----------------------
# Funciones run_docking y save_results siguen igual
# ----------------------
# Mantén todo el código de run_docking y save_results como en la versión original
# Solo asegurarse de usar CONFIG_FILE, DEFAULT_RECEPTOR y DEFAULT_LIGAND_DIR según los argumentos

def parse_energies(output):
    energies = []
    for line in output.split('\n'):
        if line.strip().startswith(tuple(str(n) for n in range(1, 10))):
            parts = line.strip().split()
            if len(parts) >= 4:
                energies.append({
                    'Mode': parts[0],
                    'Energy (kcal/mol)': parts[1],
                    'RMSD lower': parts[2],
                    'RMSD upper': parts[3]
                })
    if not energies:
        energies = [{'Mode': 'N/A', 'Energy (kcal/mol)': 'N/A', 'RMSD lower': 'N/A', 'RMSD upper': 'N/A'}]
    return energies

def split_pdbqt_models(output_file):
    models = []
    current_model = []
    with open(output_file, 'r') as f:
        for line in f:
            if line.startswith('MODEL'):
                current_model = []
            elif line.startswith('ENDMDL'):
                models.append(current_model)
                current_model = []
            else:
                current_model.append(line)
    pdb_files = []
    for i, model in enumerate(models, 1):
        if not model:
            continue
        pdb_file = output_file.parent / f"{output_file.stem}_model_{i}.pdb"
        with open(pdb_file, 'w') as f:
            for line in model:
                if line.startswith('ATOM') or line.startswith('HETATM'):
                    f.write(line[:66] + '\n')
                else:
                    f.write(line)
        pdb_files.append(pdb_file)
    return pdb_files

def run_docking(configs, output_dir=None):
    """
    Ejecuta el docking usando las configuraciones dadas.
    Si se proporciona output_dir, todas las carpetas de proteínas y ligandos se crearán dentro de esa ruta.
    Devuelve el diccionario protein_results habitual.
    """
    if not isinstance(configs, list):
        configs = [configs]

    default_results_dir = Path(WORKDIR) / 'resultados'
    if output_dir is None:
        output_dir = default_results_dir
    else:
        output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    protein_results = {}
    for config in configs:
        ligand_dir = Path(config['ligand_dir'])
        ligands = list(ligand_dir.glob('*.pdbqt'))
        protein_name = Path(config['receptor']).stem
        protein_folder = output_dir / protein_name
        if protein_folder.exists():
            shutil.rmtree(protein_folder)
        protein_folder.mkdir(parents=True, exist_ok=True)

        def process_ligand(ligand):
            lig_output_dir = protein_folder / ligand.stem
            lig_output_dir.mkdir(exist_ok=True)
            output_pdbqt = lig_output_dir / f"{ligand.stem}_docked.pdbqt"
            vina_stdout_file = lig_output_dir / "vina_output.txt"
            vina_stderr_file = lig_output_dir / "vina_stderr.txt"

            # Print progress with protein and ligand info
            print(f"🔬 [{protein_name}] Processing ligand: {ligand.stem}", flush=True)

            try:
                with open(ligand, "r") as f:
                    lines = f.readlines()
            except Exception as e:
                return [{'Ligand': ligand.stem, 'Error': str(e), 'Protein': protein_name}], \
                       [{'Ligand': ligand.stem, 'mode': 'ERROR', 'affinity (kcal/mol)': 'N/A', 'dist from best mode': str(e), 'Protein': protein_name}]
            if not lines or not any(line.startswith("ATOM") or line.startswith("HETATM") for line in lines):
                return [{'Ligand': ligand.stem, 'Error': 'Archivo .pdbqt vacío o sin líneas ATOM/HETATM', 'Protein': protein_name}], \
                       [{'Ligand': ligand.stem, 'mode': 'ERROR', 'affinity (kcal/mol)': 'N/A', 'dist from best mode': 'Archivo .pdbqt vacío o sin líneas ATOM/HETATM', 'Protein': protein_name}]

            vina_exec = os.environ.get("VINA_PATH", "vina")
            cmd = [
                vina_exec,
                '--receptor', config['receptor'],
                '--ligand', str(ligand),
                '--center_x', config['center_x'],
                '--center_y', config['center_y'],
                '--center_z', config['center_z'],
                '--size_x', config['size_x'],
                '--size_y', config['size_y'],
                '--size_z', config['size_z'],
                '--exhaustiveness', config['exhaustiveness'],
                '--out', str(output_pdbqt)
            ]
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                with open(vina_stdout_file, "w") as f:
                    f.write(result.stdout)
                with open(vina_stderr_file, "w") as f:
                    f.write(result.stderr)
                energies = parse_energies(result.stdout)
                pdb_files = split_pdbqt_models(output_pdbqt)
            except Exception as e:
                return [{'Ligand': ligand.stem, 'Error': str(e), 'Protein': protein_name}], \
                       [{'Ligand': ligand.stem, 'mode': 'ERROR', 'affinity (kcal/mol)': 'N/A', 'dist from best mode': str(e), 'Protein': protein_name}]
            excel_records = []
            txt_records = []
            for energy in energies:
                excel_records.append({
                    'Ligand': ligand.stem,
                    'Mode': energy['Mode'],
                    'Energy (kcal/mol)': energy['Energy (kcal/mol)'],
                    'RMSD lower': energy['RMSD lower'],
                    'RMSD upper': energy['RMSD upper'],
                    'Protein': protein_name
                })
                txt_records.append({
                    'Ligand': ligand.stem,
                    'mode': energy['Mode'],
                    'affinity (kcal/mol)': energy['Energy (kcal/mol)'],
                    'dist from best mode': energy['RMSD lower'],
                    'Protein': protein_name
                })
            return excel_records, txt_records

        excel_results = []
        txt_results = []
        max_workers = config['parallel_workers'] if config['parallel_workers'] is not None else None
        print(f"\n🔄 [{protein_name}] Processing {len(ligands)} ligands...\n", flush=True)
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(process_ligand, ligand): ligand for ligand in ligands}
            completed = 0
            for future in concurrent.futures.as_completed(futures):
                ligand = futures[future]
                completed += 1
                try:
                    e, t = future.result()
                    excel_results.extend(e)
                    txt_results.extend(t)
                    print(f"✅ [{protein_name}] [{completed}/{len(ligands)}] {ligand.stem} completado", flush=True)
                except Exception as e:
                    excel_results.append({'Ligand': ligand.stem, 'Error': str(e), 'Protein': protein_name})
                    txt_results.append({'Ligand': ligand.stem, 'mode': 'ERROR', 'affinity (kcal/mol)': 'N/A', 'dist from best mode': str(e), 'Protein': protein_name})
        protein_results[protein_name] = {'excel': excel_results, 'txt': txt_results, 'output_dir': protein_folder}
    return protein_results

def save_results(protein_results, output_dir=None):
    """
    Guarda los resultados de docking a partir del diccionario protein_results.
    Los archivos CSV y TXT se guardan en la carpeta de cada proteína.
    """
    for protein_name, result in protein_results.items():
        excel_data = result['excel']
        txt_data = result['txt']
        # Usar la carpeta de la proteína como directorio de salida
        out_dir = result['output_dir']
        out_dir.mkdir(parents=True, exist_ok=True)

        # Guardar CSV con resultados principales
        df_excel = pd.DataFrame(excel_data)
        drop_cols = ['RMSD lower', 'RMSD upper']
        df_csv_main = df_excel.drop(columns=[c for c in drop_cols if c in df_excel.columns], errors='ignore')
        csv_path = out_dir / f"{protein_name}_results.csv"
        df_csv_main.to_csv(csv_path, index=False)
        print(f"💾 CSV saved: {csv_path}", flush=True)

        # Guardar CSV con información extra
        extra_cols = ['Ligand', 'Mode', 'RMSD lower', 'RMSD upper']
        df_extra = df_excel[[c for c in extra_cols if c in df_excel.columns]]
        extra_csv_path = out_dir / f"{protein_name}_extra.csv"
        df_extra.to_csv(extra_csv_path, index=False)
        print(f"💾 Extra CSV saved: {extra_csv_path}", flush=True)

        # Guardar archivo TXT con resultados formateados
        txt_path = out_dir / f"{protein_name}_results.txt"
        with open(txt_path, 'w') as f:
            f.write(f"{'='*60}\n")
            f.write(f"Resultados de Docking - {protein_name}\n")
            f.write(f"{'='*60}\n\n")
            current_ligand = None
            for entry in txt_data:
                if entry['Ligand'] != current_ligand:
                    current_ligand = entry['Ligand']
                    f.write(f"\n▶ Ligand: {current_ligand}\n")
                    f.write("| mode | affinity | dist from best mode |\n")
                    f.write("-" * 50 + "\n")
                if entry['mode'] == 'ERROR':
                    f.write(f"⚠ Error: {entry['dist from best mode']}\n")
                else:
                    f.write(f"{entry['mode']}  {entry['affinity (kcal/mol)']}    {entry['dist from best mode']}\n")
        print(f"💾 TXT saved: {txt_path}", flush=True)

def main():
    print("\n🚀 Starting AutoDock Vina Batch Docking\n")
    print(f"📊 Processing {len(CONFIGS)} receptor(s)...\n")

    import multiprocessing
    cpu_count = multiprocessing.cpu_count()

    # Procesar cada configuración (cada receptor)
    for idx, config_raw in enumerate(CONFIGS, 1):
        config = parse_config(config_raw)

        if config.get('parallel_workers') is not None:
            if config['parallel_workers'] > cpu_count:
                config['parallel_workers'] = cpu_count
            elif config['parallel_workers'] < 1:
                config['parallel_workers'] = 1

        validate_paths(config)

        now_inicio = datetime.now()
        fecha_inicio_fecha = now_inicio.strftime("%Y-%m-%d")
        fecha_inicio_hora = now_inicio.strftime("%H:%M:%S")

        ligand_dir = Path(config['ligand_dir'])
        ligands = list(ligand_dir.glob("*.pdbqt"))
        ligandos_procesados_list = [lig.stem for lig in ligands]
        ligandos_procesados_str = ','.join(ligandos_procesados_list)

        # Usar el nombre del receptor como código de proteína
        protein_code = Path(config['receptor']).stem
        output_base = config['output_base']
        config['output_base'] = output_base

        batch_output_dir = Path(output_base)
        batch_output_dir.mkdir(parents=True, exist_ok=True)

        parametros = {
            "fecha_inicio_fecha": fecha_inicio_fecha,
            "hora_inicio": fecha_inicio_hora,
            "receptor": config.get('receptor', ''),
            "ligandos_procesados": ligandos_procesados_str,
            "exhaustividad": config.get('exhaustiveness', ''),
            "parallel_workers": config.get('parallel_workers', ''),
            "output_dir": str(batch_output_dir)
        }

        try:
            print(f"\n{'='*60}")
            print(f"[{idx}/{len(CONFIGS)}] Processing: {protein_code}")
            print(f"{'='*60}")
            print("\n⚙️ Configuration used:")
            print(f"• Receptor: {config['receptor']}")
            print(f"• Ligand directory: {config['ligand_dir']}")
            print(f"• Docking center: [{config['center_x']}, {config['center_y']}, {config['center_z']}]")
            print(f"• Box size: {config['size_x']}x{config['size_y']}x{config['size_z']} Å")
            print(f"• Exhaustiveness: {config['exhaustiveness']}\n")

            protein_results = run_docking(config, output_dir=batch_output_dir)
            save_results(protein_results, output_dir=batch_output_dir)

            for protein_name, result in protein_results.items():
                print(f"\n✅ [{idx}/{len(CONFIGS)}] Process completed! Results in: {result['output_dir']}\n")

            actualizar_historial(parametros, "OK", f"Execution completed successfully for {protein_code}")
        except Exception as e:
            observaciones = str(e)
            actualizar_historial(parametros, "Error", f"{observaciones} (config: {protein_code})")
            print(f"\n❌ Error in {protein_code}: {observaciones}\n")

    print(f"\n{'='*60}")
    print(f"🎉 All receptors processed!")
    print(f"{'='*60}\n")

if __name__ == '__main__':
    main()