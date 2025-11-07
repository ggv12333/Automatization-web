// ==================== Global Variables ====================
const API_URL = window.API_URL || "http://localhost:8080";
let currentMode = 'traditional';
let currentSessionId = null;
let lastResultsDir = null;
let progressInterval = null;

// ==================== Mode Switching ====================
document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const mode = tab.dataset.mode;
    switchMode(mode);
  });
});

function switchMode(mode) {
  currentMode = mode;

  // Update tabs
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Update content
  document.querySelectorAll('.mode-content').forEach(content => {
    content.classList.toggle('active', content.id === `${mode}Mode`);
  });

  // Reset form validation
  resetFormValidation();
}

// ==================== File Input Handlers ====================
function setupFileInputHandlers() {
  const fileInputs = document.querySelectorAll('.file-input');
  fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      updateFileDisplay(e.target);
    });
  });
}

function updateFileDisplay(input) {
  const selectedDiv = document.getElementById(`${input.id}Selected`);
  if (!selectedDiv) return;

  const files = Array.from(input.files);
  if (files.length === 0) {
    selectedDiv.innerHTML = '';
    return;
  }

  const fileList = files.map(f => `<span class="file-badge">✓ ${f.name}</span>`).join('');
  selectedDiv.innerHTML = `<div class="file-list">${fileList}</div>`;
}

// ==================== PDB Download Handler ====================
document.getElementById('downloadPdbBtn')?.addEventListener('click', async () => {
  const pdbCode = document.getElementById('pdbCode').value.trim().toUpperCase();
  const statusDiv = document.getElementById('pdbStatus');

  if (!pdbCode) {
    showStatus(statusDiv, 'Please enter a PDB code', 'error');
    return;
  }

  if (pdbCode.length !== 4) {
    showStatus(statusDiv, 'PDB code must be 4 characters', 'error');
    return;
  }

  showStatus(statusDiv, `Descargando PDB ${pdbCode}...`, 'loading');

  try {
    const response = await fetch(`${API_URL}/docking/download-pdb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdbCode })
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const data = await response.json();
    showStatus(statusDiv, `✓ PDB ${pdbCode} descargado y preparado`, 'success');

    // Add to receptor list
    const receptorPdbqtInput = document.getElementById('receptorPdbqt');
    if (receptorPdbqtInput) {
      // Note: This is a placeholder - actual file handling happens on backend
      console.log('PDB preparado:', data);
    }
  } catch (error) {
    showStatus(statusDiv, `Error: ${error.message}`, 'error');
  }
});

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status-message show ${type}`;
}

// ==================== Config Menu Handlers ====================
document.getElementById('uploadConfigBtn')?.addEventListener('click', (e) => {
  const uploadArea = document.getElementById('configUploadArea');
  const interactiveArea = document.getElementById('interactiveConfigArea');
  const btn = e.target.closest('.btn-small');

  uploadArea.style.display = uploadArea.style.display === 'none' ? 'block' : 'none';
  interactiveArea.style.display = 'none';

  if (btn) {
    btn.classList.toggle('active');
    document.getElementById('interactiveConfigBtn').classList.remove('active');
  }
});

document.getElementById('interactiveConfigBtn')?.addEventListener('click', (e) => {
  const uploadArea = document.getElementById('configUploadArea');
  const interactiveArea = document.getElementById('interactiveConfigArea');
  const btn = e.target.closest('.btn-small');

  interactiveArea.style.display = interactiveArea.style.display === 'none' ? 'block' : 'none';
  uploadArea.style.display = 'none';

  if (btn) {
    btn.classList.toggle('active');
    document.getElementById('uploadConfigBtn').classList.remove('active');
  }
});

// ==================== Form Validation ====================
function resetFormValidation() {
  // Reset required attributes based on mode
  const traditionalInputs = ['config', 'receptor', 'ligandos'];
  const advancedInputs = ['receptorPdb', 'receptorPdbqt', 'ligandSmiles', 'ligandSdf', 'ligandMol2', 'ligandPdbqt'];

  if (currentMode === 'traditional') {
    traditionalInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.required = true;
    });
    advancedInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.required = false;
    });
  } else {
    traditionalInputs.forEach(id => {
      const input = document.getElementById(id);
      if (input) input.required = false;
    });
    // At least one protein and one ligand required in advanced mode
  }
}

function validateForm() {
  if (currentMode === 'traditional') {
    return validateTraditionalMode();
  } else {
    return validateAdvancedMode();
  }
}

function validateTraditionalMode() {
  const config = document.getElementById('config').files.length;
  const receptor = document.getElementById('receptor').files.length;
  const ligandos = document.getElementById('ligandos').files.length;

  if (!config || !receptor || !ligandos) {
    alert('❌ Modo Tradicional: Debes subir configuración, receptores y ligandos');
    return false;
  }
  return true;
}

function validateAdvancedMode() {
  // Check if at least one protein source is provided
  const pdbCode = document.getElementById('pdbCode').value.trim();
  const receptorPdb = document.getElementById('receptorPdb').files.length;
  const receptorPdbqt = document.getElementById('receptorPdbqt').files.length;

  if (!pdbCode && !receptorPdb && !receptorPdbqt) {
    alert('❌ Modo Avanzado: Debes proporcionar al menos una proteína (código PDB, archivo PDB o PDBQT)');
    return false;
  }

  // Check if at least one ligand source is provided
  const ligandSmiles = document.getElementById('ligandSmiles').files.length;
  const ligandSdf = document.getElementById('ligandSdf').files.length;
  const ligandMol2 = document.getElementById('ligandMol2').files.length;
  const ligandPdbqt = document.getElementById('ligandPdbqt').files.length;

  if (!ligandSmiles && !ligandSdf && !ligandMol2 && !ligandPdbqt) {
    alert('❌ Modo Avanzado: Debes proporcionar al menos un ligando (SMILES, SDF, MOL2 o PDBQT)');
    return false;
  }

  // Check configuration
  const configFile = document.getElementById('configAdvanced').files.length;
  const hasInteractiveConfig = document.getElementById('interactiveConfigArea').style.display !== 'none';

  if (!configFile && !hasInteractiveConfig) {
    alert('❌ Modo Avanzado: Debes proporcionar configuración (archivo o menú interactivo)');
    return false;
  }

  return true;
}

// ==================== Form Submission ====================
document.getElementById('form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const formData = new FormData();

  if (currentMode === 'traditional') {
    // Traditional mode: add files directly
    const configFiles = document.getElementById('config').files;
    const receptorFiles = document.getElementById('receptor').files;
    const ligandFiles = document.getElementById('ligandos').files;

    for (let file of configFiles) formData.append('config', file);
    for (let file of receptorFiles) formData.append('receptor', file);
    for (let file of ligandFiles) formData.append('ligandos', file);

    formData.append('mode', 'traditional');
  } else {
    // Advanced mode: add files and metadata
    const pdbCode = document.getElementById('pdbCode').value.trim();
    if (pdbCode) formData.append('pdbCode', pdbCode);

    const receptorPdbFiles = document.getElementById('receptorPdb').files;
    const receptorPdbqtFiles = document.getElementById('receptorPdbqt').files;
    for (let file of receptorPdbFiles) formData.append('receptorPdb', file);
    for (let file of receptorPdbqtFiles) formData.append('receptorPdbqt', file);

    const ligandSmilesFiles = document.getElementById('ligandSmiles').files;
    const ligandSdfFiles = document.getElementById('ligandSdf').files;
    const ligandMol2Files = document.getElementById('ligandMol2').files;
    const ligandPdbqtFiles = document.getElementById('ligandPdbqt').files;
    for (let file of ligandSmilesFiles) formData.append('ligandSmiles', file);
    for (let file of ligandSdfFiles) formData.append('ligandSdf', file);
    for (let file of ligandMol2Files) formData.append('ligandMol2', file);
    for (let file of ligandPdbqtFiles) formData.append('ligandPdbqt', file);

    const configFiles = document.getElementById('configAdvanced').files;
    for (let file of configFiles) formData.append('configAdvanced', file);

    // Add interactive config if present
    if (document.getElementById('interactiveConfigArea').style.display !== 'none') {
      const config = {
        center_x: document.getElementById('centerX').value,
        center_y: document.getElementById('centerY').value,
        center_z: document.getElementById('centerZ').value,
        size_x: document.getElementById('sizeX').value,
        size_y: document.getElementById('sizeY').value,
        size_z: document.getElementById('sizeZ').value,
        exhaustiveness: document.getElementById('exhaustiveness').value,
        scoring_function: document.getElementById('scoringFunction').value
      };
      formData.append('interactiveConfig', JSON.stringify(config));
    }

    formData.append('mode', 'advanced');
  }

  try {
    const res = await fetch(`${API_URL}/docking/run`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error: ${res.status}`);
    }

    currentSessionId = data.sessionId;
    lastResultsDir = data.results_dir;

    // Show progress section
    showSection('progress');

    // Start polling
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => pollProgress(currentSessionId), 500);

  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

// ==================== Utility Functions ====================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(section => {
    section.style.display = 'none';
  });
  const section = document.getElementById(`${sectionId}Section`);
  if (section) section.style.display = 'block';
}

function pollProgress(sessionId) {
  // Placeholder for progress polling
  console.log('Polling progress for session:', sessionId);
}

// ==================== Download Handler ====================
document.getElementById('downloadBtn')?.addEventListener('click', async () => {
  if (!lastResultsDir) {
    alert('No hay resultados disponibles');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/docking/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results_dir: lastResultsDir })
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(`Error downloading results: ${error.message}`);
  }
});

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
  setupFileInputHandlers();
  resetFormValidation();
});