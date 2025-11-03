// ==================== Wizard State Management ====================
const wizardState = {
  currentStep: 1,
  proteinMethod: null,
  proteins: [],
  configStrategy: 'single',
  ligandMethod: 'pdbqt',
  ligands: [],
  preparationOptions: {
    removeWaters: true,
    addHydrogens: true,
    repairAtoms: true,
    pH: 7.4,
    keepHetero: false
  }
};

// ==================== Step Navigation ====================
function goToStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll('.wizard-step').forEach(step => {
    step.classList.remove('active');
  });

  // Show target step
  const targetStep = document.getElementById(`step${stepNumber}`);
  if (targetStep) {
    targetStep.classList.add('active');
  }

  // Update progress indicator
  document.querySelectorAll('.step-item').forEach((item, index) => {
    const itemStep = index + 1;
    item.classList.remove('active', 'completed');
    
    if (itemStep < stepNumber) {
      item.classList.add('completed');
    } else if (itemStep === stepNumber) {
      item.classList.add('active');
    }
  });

  wizardState.currentStep = stepNumber;
}

// ==================== Step 1: Protein Selection ====================
function initStep1() {
  // Protein method selection
  document.querySelectorAll('input[name="proteinMethod"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      wizardState.proteinMethod = e.target.value;
      
      // Hide all method areas
      document.getElementById('pdbqtUploadArea').style.display = 'none';
      document.getElementById('pdbUploadArea').style.display = 'none';
      document.getElementById('pdbIdInputArea').style.display = 'none';

      // Show selected method area
      if (e.target.value === 'pdbqt') {
        document.getElementById('pdbqtUploadArea').style.display = 'block';
      } else if (e.target.value === 'pdb') {
        document.getElementById('pdbUploadArea').style.display = 'block';
      } else if (e.target.value === 'pdbid') {
        document.getElementById('pdbIdInputArea').style.display = 'block';
      }
    });
  });

  // File displays
  setupFileDisplay('receptorPdbqt', 'receptorPdbqtSelected');
  setupFileDisplay('receptorPdb', 'receptorPdbSelected');

  // Step 1 Next button
  document.getElementById('step1Next').addEventListener('click', () => {
    if (validateStep1()) {
      updateStep2Content();
      goToStep(2);
    }
  });
}

function validateStep1() {
  if (!wizardState.proteinMethod) {
    alert('Please select a protein input method');
    return false;
  }

  if (wizardState.proteinMethod === 'pdbqt') {
    const files = document.getElementById('receptorPdbqt').files;
    if (files.length === 0) {
      alert('Please upload at least one PDBQT file');
      return false;
    }
    wizardState.proteins = Array.from(files).map(f => f.name);
  } else if (wizardState.proteinMethod === 'pdb') {
    const files = document.getElementById('receptorPdb').files;
    if (files.length === 0) {
      alert('Please upload at least one PDB file');
      return false;
    }
    wizardState.proteins = Array.from(files).map(f => f.name);
  } else if (wizardState.proteinMethod === 'pdbid') {
    const codes = document.getElementById('pdbCodes').value.trim();
    if (!codes) {
      alert('Please enter at least one PDB code');
      return false;
    }
    wizardState.proteins = codes.split(',').map(c => c.trim().toUpperCase());
  }

  return true;
}

// ==================== Step 2: Protein Preparation ====================
function initStep2() {
  // Advanced prep toggle
  document.getElementById('toggleAdvancedPrep').addEventListener('click', () => {
    const advancedOptions = document.getElementById('advancedPrepOptions');
    const icon = document.getElementById('advancedPrepIcon');
    
    if (advancedOptions.style.display === 'none' || !advancedOptions.style.display) {
      advancedOptions.style.display = 'block';
      icon.textContent = '▼';
    } else {
      advancedOptions.style.display = 'none';
      icon.textContent = '▶';
    }
  });

  // Preparation options
  document.getElementById('prepRemoveWaters').addEventListener('change', (e) => {
    wizardState.preparationOptions.removeWaters = e.target.checked;
  });

  document.getElementById('prepAddHydrogens').addEventListener('change', (e) => {
    wizardState.preparationOptions.addHydrogens = e.target.checked;
  });

  document.getElementById('prepRepairAtoms').addEventListener('change', (e) => {
    wizardState.preparationOptions.repairAtoms = e.target.checked;
  });

  document.getElementById('prepPH').addEventListener('change', (e) => {
    wizardState.preparationOptions.pH = parseFloat(e.target.value);
  });

  document.getElementById('prepKeepHetero').addEventListener('change', (e) => {
    wizardState.preparationOptions.keepHetero = e.target.checked;
  });

  // Navigation
  document.getElementById('step2Prev').addEventListener('click', () => goToStep(1));
  document.getElementById('step2Next').addEventListener('click', () => {
    goToStep(3);
  });
}

function updateStep2Content() {
  if (wizardState.proteinMethod === 'pdbqt') {
    // PDBQT files don't need preparation
    document.getElementById('preparationNeeded').style.display = 'none';
    document.getElementById('preparationNotNeeded').style.display = 'block';

    const summary = document.getElementById('pdbqtSummary');
    summary.innerHTML = `<strong>PDBQT files:</strong><br>${wizardState.proteins.join('<br>')}`;
  } else {
    // PDB files or PDB IDs need preparation
    document.getElementById('preparationNeeded').style.display = 'block';
    document.getElementById('preparationNotNeeded').style.display = 'none';

    const list = document.getElementById('proteinList');
    list.innerHTML = wizardState.proteins.join(', ');
  }
}

// ==================== Step 3: Configuration ====================
function initStep3() {
  // Config strategy selection
  document.querySelectorAll('input[name="configStrategy"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      wizardState.configStrategy = e.target.value;
      
      if (e.target.value === 'single') {
        document.getElementById('singleConfigArea').style.display = 'block';
        document.getElementById('multipleConfigArea').style.display = 'none';
      } else {
        document.getElementById('singleConfigArea').style.display = 'none';
        document.getElementById('multipleConfigArea').style.display = 'block';
        generatePerProteinConfigs();
      }
    });
  });

  // Single config method toggle
  document.querySelectorAll('.config-method-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const method = e.currentTarget.dataset.method;
      
      document.querySelectorAll('.config-method-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      if (method === 'manual') {
        document.getElementById('manualConfigArea').style.display = 'block';
        document.getElementById('uploadConfigArea').style.display = 'none';
      } else {
        document.getElementById('manualConfigArea').style.display = 'none';
        document.getElementById('uploadConfigArea').style.display = 'block';
      }
    });
  });

  // Multiple config method toggle
  document.querySelectorAll('.config-method-btn-multi').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const method = e.currentTarget.dataset.method;
      
      document.querySelectorAll('.config-method-btn-multi').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      if (method === 'upload-multi') {
        document.getElementById('uploadMultiConfigArea').style.display = 'block';
        document.getElementById('manualMultiConfigArea').style.display = 'none';
      } else {
        document.getElementById('uploadMultiConfigArea').style.display = 'none';
        document.getElementById('manualMultiConfigArea').style.display = 'block';
      }
    });
  });

  // File displays
  setupFileDisplay('configAdvanced', 'configAdvancedSelected');
  setupFileDisplay('configMultiple', 'configMultipleSelected');

  // Navigation
  document.getElementById('step3Prev').addEventListener('click', () => goToStep(2));
  document.getElementById('step3Next').addEventListener('click', () => {
    if (validateStep3()) {
      goToStep(4);
    }
  });
}

function generatePerProteinConfigs() {
  const container = document.getElementById('perProteinConfigs');
  container.innerHTML = '';

  wizardState.proteins.forEach((protein, index) => {
    const panel = document.createElement('div');
    panel.className = 'protein-config-panel';
    panel.innerHTML = `
      <div class="protein-config-header" onclick="toggleProteinConfig(${index})">
        <span>${protein}</span>
        <span id="configToggle${index}">▶</span>
      </div>
      <div class="protein-config-body" id="configBody${index}">
        <div class="config-form">
          <div class="config-row">
            <div class="config-input">
              <label>Center X</label>
              <input type="number" id="centerX_${index}" step="0.1" placeholder="102.901" class="text-input">
            </div>
            <div class="config-input">
              <label>Center Y</label>
              <input type="number" id="centerY_${index}" step="0.1" placeholder="114.945" class="text-input">
            </div>
            <div class="config-input">
              <label>Center Z</label>
              <input type="number" id="centerZ_${index}" step="0.1" placeholder="50.0" class="text-input">
            </div>
          </div>
          <div class="config-row">
            <div class="config-input">
              <label>Size X (Å)</label>
              <input type="number" id="sizeX_${index}" step="0.1" placeholder="20" class="text-input">
            </div>
            <div class="config-input">
              <label>Size Y (Å)</label>
              <input type="number" id="sizeY_${index}" step="0.1" placeholder="20" class="text-input">
            </div>
            <div class="config-input">
              <label>Size Z (Å)</label>
              <input type="number" id="sizeZ_${index}" step="0.1" placeholder="20" class="text-input">
            </div>
          </div>
          <div class="config-row">
            <div class="config-input">
              <label>Exhaustiveness</label>
              <input type="number" id="exhaustiveness_${index}" min="1" max="32" value="8" class="text-input">
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(panel);
  });
}

function toggleProteinConfig(index) {
  const body = document.getElementById(`configBody${index}`);
  const toggle = document.getElementById(`configToggle${index}`);
  
  if (body.classList.contains('active')) {
    body.classList.remove('active');
    toggle.textContent = '▶';
  } else {
    body.classList.add('active');
    toggle.textContent = '▼';
  }
}

function validateStep3() {
  // Basic validation - can be enhanced
  return true;
}

// ==================== Step 4: Ligands ====================
function initStep4() {
  // Ligand method selection
  document.querySelectorAll('.ligand-method-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const method = e.currentTarget.dataset.method;
      wizardState.ligandMethod = method;
      
      document.querySelectorAll('.ligand-method-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      if (method === 'pdbqt') {
        document.getElementById('pdbqtLigandsArea').style.display = 'block';
        document.getElementById('otherLigandsArea').style.display = 'none';
      } else {
        document.getElementById('pdbqtLigandsArea').style.display = 'none';
        document.getElementById('otherLigandsArea').style.display = 'block';
      }
      
      updateJobSummary();
    });
  });

  // Format tabs
  document.querySelectorAll('.format-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const format = e.currentTarget.dataset.format;
      
      document.querySelectorAll('.format-tab').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      document.querySelectorAll('.format-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`${format}Content`).classList.add('active');
    });
  });

  // File displays
  setupFileDisplay('ligandPdbqt', 'ligandPdbqtSelected', updateJobSummary);
  setupFileDisplay('ligandSmiles', 'ligandSmilesSelected', updateJobSummary);
  setupFileDisplay('ligandSdf', 'ligandSdfSelected', updateJobSummary);
  setupFileDisplay('ligandMol2', 'ligandMol2Selected', updateJobSummary);

  // Navigation
  document.getElementById('step4Prev').addEventListener('click', () => goToStep(3));

  // Submit button - trigger form submission
  document.getElementById('submitAdvanced').addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Submit button clicked');
    console.log('Wizard state:', wizardState);

    if (validateStep4()) {
      console.log('Validation passed, submitting form');
      // Trigger the main form submission
      const form = document.getElementById('form');
      if (form) {
        console.log('Form found, dispatching submit event');
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      } else {
        console.error('Form not found!');
      }
    } else {
      console.log('Validation failed');
    }
  });

  // Initial summary update
  updateJobSummary();
}

function validateStep4() {
  console.log('Validating Step 4...');
  console.log('Ligand method:', wizardState.ligandMethod);
  console.log('Proteins:', wizardState.proteins);

  let ligandCount = 0;

  if (wizardState.ligandMethod === 'pdbqt') {
    ligandCount = document.getElementById('ligandPdbqt').files.length;
    console.log('PDBQT ligand count:', ligandCount);
    if (ligandCount === 0) {
      alert('Please upload at least one PDBQT ligand file');
      return false;
    }
  } else {
    ligandCount += document.getElementById('ligandSmiles').files.length;
    ligandCount += document.getElementById('ligandSdf').files.length;
    ligandCount += document.getElementById('ligandMol2').files.length;
    console.log('Other ligand count:', ligandCount);

    if (ligandCount === 0) {
      alert('Please upload at least one ligand file');
      return false;
    }
  }

  if (wizardState.proteins.length === 0) {
    alert('Error: No proteins selected');
    return false;
  }

  console.log('Validation passed!');
  return true;
}

function updateJobSummary() {
  let ligandCount = 0;
  
  if (wizardState.ligandMethod === 'pdbqt') {
    ligandCount = document.getElementById('ligandPdbqt').files.length;
  } else {
    ligandCount += document.getElementById('ligandSmiles').files.length;
    ligandCount += document.getElementById('ligandSdf').files.length;
    ligandCount += document.getElementById('ligandMol2').files.length;
  }

  const proteinCount = wizardState.proteins.length;
  const totalJobs = proteinCount * ligandCount;
  const estimatedTime = Math.ceil(totalJobs * 2); // 2 minutes per job estimate

  document.getElementById('summaryProteins').textContent = proteinCount;
  document.getElementById('summaryLigands').textContent = ligandCount;
  document.getElementById('summaryJobs').textContent = totalJobs;
  document.getElementById('summaryTime').textContent = `~${estimatedTime} min`;
}

// ==================== Helper Functions ====================
function setupFileDisplay(inputId, displayId, callback) {
  const input = document.getElementById(inputId);
  const display = document.getElementById(displayId);

  if (input && display) {
    input.addEventListener('change', () => {
      displayFileList(input, display);
      if (callback) callback();
    });
  }
}

function displayFileList(input, display) {
  const files = input.files;
  display.innerHTML = ''; // Clear previous display

  if (files.length === 0) {
    return;
  }

  // Create a container for file list
  const fileListContainer = document.createElement('div');
  fileListContainer.className = 'file-list-container';

  Array.from(files).forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';

    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = file.name;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'file-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove file';
    deleteBtn.type = 'button';
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      removeFile(input, display, index);
    };

    fileItem.appendChild(fileName);
    fileItem.appendChild(deleteBtn);
    fileListContainer.appendChild(fileItem);
  });

  display.appendChild(fileListContainer);
}

function removeFile(input, display, indexToRemove) {
  const dt = new DataTransfer();
  const files = input.files;

  // Add all files except the one to remove
  Array.from(files).forEach((file, index) => {
    if (index !== indexToRemove) {
      dt.items.add(file);
    }
  });

  // Update the input's files
  input.files = dt.files;

  // Refresh the display
  displayFileList(input, display);

  // Trigger change event to update wizard state
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ==================== Initialize Wizard ====================
function initWizard() {
  initStep1();
  initStep2();
  initStep3();
  initStep4();
  goToStep(1);
}

// Make toggleProteinConfig available globally
window.toggleProteinConfig = toggleProteinConfig;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWizard);
} else {
  initWizard();
}

