#!/usr/bin/env python3
"""
Molecule preparation module for AutoDock Vina
Handles conversion of SMILES, SDF, MOL2 to PDBQT format
Also handles PDB download and preparation
"""

import os
import sys
import subprocess
import json
import shutil
from pathlib import Path
import requests
from typing import Optional, List, Tuple

# Try to import Meeko
try:
    from meeko import MoleculePreparation, PDBQTWriterLegacy
    MEEKO_AVAILABLE = True
except ImportError:
    MEEKO_AVAILABLE = False
    print("⚠️  Warning: Meeko not available. Some features will be limited.", file=sys.stderr)

# Try to import RDKit
try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False
    print("⚠️  Warning: RDKit not available. SMILES conversion will be limited.", file=sys.stderr)


class MoleculePreparator:
    """Handles preparation of molecules for docking"""
    
    def __init__(self, output_dir: str = "/tmp"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # External tool paths (can be overridden via env)
        # reduce: MolProbity reduce executable for adding hydrogens to proteins
        self.reduce_exec = os.environ.get('REDUCE_PATH', 'reduce')
        # scrub.py: external protonation/tautomerization script for ligands
        self.scrub_exec = os.environ.get('SCRUB_PY_PATH', 'scrub.py')
    
    def download_pdb(self, pdb_code: str) -> Optional[Path]:
        """Download PDB file from RCSB"""
        pdb_code = pdb_code.upper()
        pdb_file = self.output_dir / f"{pdb_code}.pdb"
        
        try:
            url = f"https://files.rcsb.org/download/{pdb_code}.pdb"
            print(f"📥 Downloading PDB {pdb_code} from {url}...", flush=True)
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            with open(pdb_file, 'w') as f:
                f.write(response.text)
            
            print(f"✅ PDB {pdb_code} downloaded: {pdb_file}", flush=True)
            return pdb_file
        except Exception as e:
            print(f"❌ Error downloading PDB {pdb_code}: {str(e)}", flush=True)
            return None
    
    def prepare_receptor(self, pdb_file: str) -> Optional[Path]:
        """Prepare receptor using mk_prepare_receptor.py"""
        pdb_path = Path(pdb_file)
        pdbqt_path = self.output_dir / f"{pdb_path.stem}_receptor.pdbqt"
        
        try:
            print(f"🔧 Preparing receptor: {pdb_path.name}...", flush=True)

            # First, attempt to run reduce to add hydrogens (if available)
            reduced_pdb = self.output_dir / f"{pdb_path.stem}_reduced.pdb"
            try:
                print(f"🧪 Running reduce ({self.reduce_exec}) to add hydrogens...", flush=True)
                # reduce typically writes stdout with the new PDB content
                proc = subprocess.run([self.reduce_exec, str(pdb_path)], capture_output=True, text=True, check=True)
                with open(reduced_pdb, 'w') as f:
                    f.write(proc.stdout)
                print(f"✅ reduce completed, wrote: {reduced_pdb}", flush=True)
                pdb_to_use = reduced_pdb
            except FileNotFoundError:
                print(f"⚠️  reduce not found at {self.reduce_exec}, skipping hydrogen addition", flush=True)
                pdb_to_use = pdb_path
            except subprocess.CalledProcessError as e:
                print(f"⚠️  reduce failed: {e}. Continuing with original PDB", flush=True)
                pdb_to_use = pdb_path

            # Now call mk_prepare_receptor.py on the (possibly reduced) PDB
            cmd = [
                'mk_prepare_receptor.py',
                '-r', str(pdb_to_use),
                '-o', str(pdbqt_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"✅ Receptor prepared: {pdbqt_path}", flush=True)
            return pdbqt_path
        except Exception as e:
            print(f"❌ Error preparing receptor: {str(e)}", flush=True)
            return None
    
    def prepare_ligand_from_smiles(self, smiles: str, ligand_name: str) -> Optional[Path]:
        """Convert SMILES to PDBQT"""
        if not RDKIT_AVAILABLE or not MEEKO_AVAILABLE:
            print(f"❌ RDKit or Meeko not available for SMILES conversion", flush=True)
            return None
        
        try:
            print(f"🧪 Converting SMILES to PDBQT: {ligand_name}...", flush=True)
            
            # Create molecule from SMILES
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                print(f"❌ Invalid SMILES: {smiles}", flush=True)
                return None
            
            # Add hydrogens and generate 3D coordinates
            mol = Chem.AddHs(mol)
            AllChem.EmbedMolecule(mol, randomSeed=42)
            AllChem.MMFFOptimizeMolecule(mol)
            
            # Prepare with Meeko
            preparator = MoleculePreparation()
            mol_setups = preparator.prepare(mol)
            
            if not mol_setups:
                print(f"❌ Failed to prepare molecule: {ligand_name}", flush=True)
                return None
            
            # Write PDBQT
            pdbqt_path = self.output_dir / f"{ligand_name}.pdbqt"
            pdbqt_string = PDBQTWriterLegacy.write_string(mol_setups[0])
            
            with open(pdbqt_path, 'w') as f:
                f.write(pdbqt_string)
            
            print(f"✅ PDBQT created: {pdbqt_path}", flush=True)
            return pdbqt_path
        except Exception as e:
            print(f"❌ Error converting SMILES: {str(e)}", flush=True)
            return None
    
    def prepare_ligand_from_file(self, input_file: str) -> Optional[Path]:
        """Convert SDF/MOL2 to PDBQT using mk_prepare_ligand.py"""
        input_path = Path(input_file)
        pdbqt_path = self.output_dir / f"{input_path.stem}.pdbqt"
        
        try:
            print(f"🔧 Preparing ligand: {input_path.name}...", flush=True)

            # Optional: run scrub.py to add hydrogens/protonate/tautomerize if available
            preprocessed_input = input_path
            try:
                # Only run scrub for typical molecule formats
                if input_path.suffix.lower() in ['.sdf', '.mol2', '.smi', '.smiles']:
                    scrub_out = self.output_dir / f"{input_path.stem}_scrubbed{input_path.suffix}"
                    print(f"🧪 Running scrub ({self.scrub_exec}) on {input_path.name}...", flush=True)
                    proc = subprocess.run([self.scrub_exec, str(input_path), str(scrub_out)], capture_output=True, text=True, check=True)
                    if scrub_out.exists():
                        preprocessed_input = scrub_out
                        print(f"✅ scrub completed, wrote: {scrub_out}", flush=True)
            except FileNotFoundError:
                print(f"⚠️  scrub.py not found at {self.scrub_exec}, skipping ligand protonation", flush=True)
            except subprocess.CalledProcessError as e:
                print(f"⚠️  scrub.py failed: {e}. Continuing with original ligand file", flush=True)

            # Use mk_prepare_ligand.py on the (possibly preprocessed) input
            cmd = [
                'mk_prepare_ligand.py',
                '-i', str(preprocessed_input),
                '-o', str(pdbqt_path)
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"✅ Ligand prepared: {pdbqt_path}", flush=True)
            return pdbqt_path
        except Exception as e:
            print(f"❌ Error preparing ligand: {str(e)}", flush=True)
            return None
    
    def process_smiles_file(self, smiles_file: str) -> List[Path]:
        """Process SMILES file (one SMILES per line)"""
        results = []
        smiles_path = Path(smiles_file)
        
        try:
            with open(smiles_path, 'r') as f:
                for idx, line in enumerate(f, 1):
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse SMILES line (format: SMILES [name])
                    parts = line.split()
                    smiles = parts[0]
                    name = parts[1] if len(parts) > 1 else f"ligand_{idx}"
                    
                    pdbqt = self.prepare_ligand_from_smiles(smiles, name)
                    if pdbqt:
                        results.append(pdbqt)
            
            return results
        except Exception as e:
            print(f"❌ Error processing SMILES file: {str(e)}", flush=True)
            return results


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 3:
        print("Usage:", file=sys.stderr)
        print("  download-pdb <pdb_code> <output_dir>", file=sys.stderr)
        print("  prepare-receptor <pdb_file> <output_dir>", file=sys.stderr)
        print("  prepare-ligands <json_files> <output_dir>", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "download-pdb":
        if len(sys.argv) != 4:
            print("❌ Error: download-pdb requires: <pdb_code> <output_dir>", file=sys.stderr)
            sys.exit(1)
        
        pdb_code = sys.argv[2]
        output_dir = sys.argv[3]
        
        preparator = MoleculePreparator(output_dir)
        
        # Download PDB
        pdb_file = preparator.download_pdb(pdb_code)
        if not pdb_file:
            print(f"❌ Failed to download PDB {pdb_code}", file=sys.stderr)
            sys.exit(1)
        
        # Prepare receptor
        pdbqt_file = preparator.prepare_receptor(str(pdb_file))
        if not pdbqt_file:
            print(f"❌ Failed to prepare receptor for {pdb_code}", file=sys.stderr)
            sys.exit(1)
        
        print(f"✅ Success: {pdbqt_file}", flush=True)
        sys.exit(0)
    
    elif command == "prepare-receptor":
        if len(sys.argv) != 4:
            print("❌ Error: prepare-receptor requires: <pdb_file> <output_dir>", file=sys.stderr)
            sys.exit(1)
        
        pdb_file = sys.argv[2]
        output_dir = sys.argv[3]
        
        if not os.path.exists(pdb_file):
            print(f"❌ Error: PDB file not found: {pdb_file}", file=sys.stderr)
            sys.exit(1)
        
        preparator = MoleculePreparator(output_dir)
        
        # Prepare receptor
        pdbqt_file = preparator.prepare_receptor(pdb_file)
        if not pdbqt_file:
            print(f"❌ Failed to prepare receptor from {pdb_file}", file=sys.stderr)
            sys.exit(1)
        
        print(f"✅ Success: {pdbqt_file}", flush=True)
        sys.exit(0)
    
    elif command == "prepare-ligands":
        if len(sys.argv) != 4:
            print("❌ Error: prepare-ligands requires: <json_files> <output_dir>", file=sys.stderr)
            sys.exit(1)
        
        import json
        json_files_str = sys.argv[2]
        output_dir = sys.argv[3]
        
        try:
            ligand_files = json.loads(json_files_str)
        except json.JSONDecodeError as e:
            print(f"❌ Error parsing JSON: {e}", file=sys.stderr)
            sys.exit(1)
        
        preparator = MoleculePreparator(output_dir)
        prepared_files = []
        errors = []
        
        # Process SMILES files
        for smiles_file in ligand_files.get('smiles', []):
            if not os.path.exists(smiles_file):
                errors.append(f"SMILES file not found: {smiles_file}")
                continue
            
            results = preparator.process_smiles_file(smiles_file)
            prepared_files.extend(results)
        
        # Process SDF files
        for sdf_file in ligand_files.get('sdf', []):
            if not os.path.exists(sdf_file):
                errors.append(f"SDF file not found: {sdf_file}")
                continue
            
            pdbqt = preparator.prepare_ligand_from_file(sdf_file)
            if pdbqt:
                prepared_files.append(pdbqt)
            else:
                errors.append(f"Failed to convert SDF: {sdf_file}")
        
        # Process MOL2 files
        for mol2_file in ligand_files.get('mol2', []):
            if not os.path.exists(mol2_file):
                errors.append(f"MOL2 file not found: {mol2_file}")
                continue
            
            pdbqt = preparator.prepare_ligand_from_file(mol2_file)
            if pdbqt:
                prepared_files.append(pdbqt)
            else:
                errors.append(f"Failed to convert MOL2: {mol2_file}")
        
        # PDBQT files are already prepared, just copy them
        for pdbqt_file in ligand_files.get('pdbqt', []):
            if os.path.exists(pdbqt_file):
                import shutil
                dest = Path(output_dir) / Path(pdbqt_file).name
                shutil.copy2(pdbqt_file, dest)
                prepared_files.append(dest)
            else:
                errors.append(f"PDBQT file not found: {pdbqt_file}")
        
        # Report results
        if prepared_files:
            print(f"✅ Prepared {len(prepared_files)} ligand(s)", flush=True)
            for f in prepared_files:
                print(f"  - {f}", flush=True)
        
        if errors:
            for error in errors:
                print(f"⚠️  {error}", file=sys.stderr, flush=True)
        
        if not prepared_files and errors:
            print("❌ No ligands were successfully prepared", file=sys.stderr)
            sys.exit(1)
        
        sys.exit(0)
    
    else:
        print(f"❌ Unknown command: {command}", file=sys.stderr)
        print("Available commands: download-pdb, prepare-receptor, prepare-ligands", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

