#!/usr/bin/env python3
"""
Molecule preparation module for AutoDock Vina
Handles conversion of SMILES, SDF, MOL2 to PDBQT format
Also handles PDB download and preparation
"""

import os
import sys
import subprocess
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
            
            # Try using mk_prepare_receptor.py
            cmd = [
                'mk_prepare_receptor.py',
                '-r', str(pdb_path),
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
            
            # Use mk_prepare_ligand.py
            cmd = [
                'mk_prepare_ligand.py',
                '-i', str(input_path),
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
    """Test the preparation module"""
    preparator = MoleculePreparator("/tmp/test_prep")
    
    # Test PDB download
    pdb_file = preparator.download_pdb("7E2Y")
    if pdb_file:
        pdbqt = preparator.prepare_receptor(str(pdb_file))
    
    # Test SMILES conversion
    smiles = "CC(=O)Oc1ccccc1C(=O)O"  # Aspirin
    pdbqt = preparator.prepare_ligand_from_smiles(smiles, "aspirin")


if __name__ == "__main__":
    main()

