const dropArea = document.getElementById('file-drop-area');
const fileInput = document.getElementById('file-input');
const loadingContainer = document.getElementById('loading-container');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const chatHistory = document.getElementById('chat-history');
const droppedFilesContainer = document.getElementById('dropped-files-container');
const droppedFilesList = document.getElementById('dropped-files-list');
const uploadBtn = document.getElementById('upload-btn');
const clearBtn = document.getElementById('clear-btn');
const contentFolders = document.getElementById('content-folders');

const requiredFileTypes = ['char.json', 'data.json', 'fr.json', 'qa.json'];
let droppedFiles = [];

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Set up folder toggle functionality
document.addEventListener('click', function (e) {
    if (e.target.closest('.folder-header') || e.target.closest('.folder-toggle')) {
        const folderElement = e.target.closest('.draggable-folder');
        if (!folderElement) return;
        const folderStructure = folderElement.querySelector('.folder-structure');
        const toggleIcon = folderElement.querySelector('.folder-toggle');
        folderStructure.classList.toggle('active');
        toggleIcon.classList.toggle('fa-chevron-down');
        toggleIcon.classList.toggle('fa-chevron-up');
    }
});

// Drag handling for files created dynamically in the folders list
// Use event delegation on `contentFolders` so dynamically added elements work
contentFolders.addEventListener('dragstart', function (e) {
    const fileEl = e.target.closest('.draggable-file');
    if (!fileEl) return;
    const filename = fileEl.dataset.filename;
    const folder = fileEl.dataset.folder;
    e.dataTransfer.setData('text/plain', `${folder}|${filename}`);
    fileEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
});
contentFolders.addEventListener('dragend', function (e) {
    const fileEl = e.target.closest('.draggable-file');
    if (fileEl) fileEl.classList.remove('dragging');
});

// Set up drop area to receive files
dropArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    this.classList.add('dragover');
});

dropArea.addEventListener('dragleave', function() {
    this.classList.remove('dragover');
});

dropArea.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('dragover');
    const payload = e.dataTransfer.getData('text/plain');
    if (!payload) return;
    if (payload.includes('|')) {
        const [folder, filename] = payload.split('|');
        if (filename && filename.endsWith('.json')) addDroppedFile(folder, filename);
    } else if (payload.endsWith('.json')) {
        addDroppedFile(null, payload);
    }
});

// Click to upload
dropArea.addEventListener('click', () => {
    fileInput.click();
});

// File selection
fileInput.addEventListener('change', handleFileSelect);
function handleFileSelect(e) {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
        if (!files[i].name.endsWith('.json')) continue;
        const name = files[i].name;
        if (name.includes('_')) {
            const [folder, filename] = name.split('_');
            addDroppedFile(folder, filename);
        } else {
            addDroppedFile(null, name);
        }
    }
}

function addDroppedFile(folder, filename) {
  if (typeof filename !== 'string') return;
  filename = filename.trim();
  const existingIndex = droppedFiles.findIndex(f => f.filename === filename && f.folder === folder);
  if (existingIndex !== -1) return;
  const sameTypeIndex = droppedFiles.findIndex(f => f.filename === filename && f.folder !== folder);
  if (sameTypeIndex !== -1) {
    droppedFiles[sameTypeIndex] = { folder, filename };
    const fileItems = droppedFilesList.querySelectorAll('.file-item');
    fileItems[sameTypeIndex].innerHTML = `
            <i class="fas fa-file-code text-yellow-500 mr-2"></i>
            <span class="text-sm text-gray-700">${folder ? folder + '/' : ''}${filename}</span>
            <i class="fas fa-check-circle text-green-500 ml-auto"></i>
        `;
    return;
  }
  droppedFiles.push({ folder, filename });
  const fileItem = document.createElement('div');
  fileItem.className = 'file-item';
  fileItem.innerHTML = `
        <i class="fas fa-file-code text-yellow-500 mr-2"></i>
        <span class="text-sm text-gray-700">${folder ? folder + '/' : ''}${filename}</span>
        <i class="fas fa-check-circle text-green-500 ml-auto"></i>
    `;
  droppedFilesList.appendChild(fileItem);
  droppedFilesContainer.classList.remove('hidden');
  if (checkRequiredFiles()) {
    dropArea.classList.add('all-files-dropped');
    uploadBtn.classList.add('active');
    addMessage('ai', '✅ All required files detected! Click "Upload Files" to begin processing.');
  }
}

function checkRequiredFiles() {
    if (droppedFiles.length < 4) return false;
    const byFolder = {};
    for (const f of droppedFiles) {
        const key = f.folder || '__NO_FOLDER__';
        if (!byFolder[key]) byFolder[key] = new Set();
        byFolder[key].add(f.filename);
    }
    return Object.keys(byFolder).some(folder => requiredFileTypes.every(req => byFolder[folder].has(req)) && folder !== '__NO_FOLDER__');
}

// Upload button click event
uploadBtn.addEventListener('click', function() {
    if (this.classList.contains('active') && checkRequiredFiles()) {
        startUploadProcess();
    }
});

// Clear button click event
clearBtn.addEventListener('click', function() {
    // Clear dropped files
    droppedFiles = [];
    droppedFilesList.innerHTML = '';
    droppedFilesContainer.classList.add('hidden');
    // Reset drop area
    dropArea.classList.remove('all-files-dropped');
    uploadBtn.classList.remove('active');
    // Clear chat history
    chatHistory.innerHTML = '';
    // Hide loading
    loadingContainer.classList.add('hidden');
    // Reset upload button
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Files';
    // Add welcome message
    addMessage('ai', 'Welcome to the research analysis system! Please drag 4 JSON files (char.json, data.json, fr.json, qa.json) to the upload area to begin analysis.');
});

function startUploadProcess() {
    // Disable button and show loading
    uploadBtn.classList.remove('active');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';
    // Show loading bar
    loadingContainer.classList.remove('hidden');
    loadingBar.style.width = '0%';
    loadingText.textContent = 'Uploading files...';
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 5;
        loadingBar.style.width = `${progress}%`;
        loadingText.textContent = `Uploading... ${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            loadingText.textContent = 'Upload successful!';
            // Add user message
            const uploadedList = droppedFiles.map(f => (f.folder ? f.folder + '/' : '') + f.filename);
            addMessage('user', `Uploaded ${droppedFiles.length} files: ${uploadedList.join(', ')}`);
            // Hide loading and start processing
            setTimeout(() => {
                loadingContainer.classList.add('hidden');
                simulateProcessing();
            }, 1000);
        }
    }, 100);
}

function addMessage(sender, content, isMarkdown = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    const messageContent = document.createElement('div');
    messageContent.className = `max-w-3xl p-4 rounded-lg ${
        sender === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-800'
    }`;
    if (isMarkdown) {
        messageContent.innerHTML = marked.parse(content);
        messageContent.classList.add('markdown-content');
    } else {
        messageContent.textContent = content;
    }
    messageDiv.appendChild(messageContent);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Add task loading message function
function addTaskLoadingMessage(taskName) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message flex justify-start';
    messageDiv.id = `task-${taskName.replace(/\s+/g, '-')}`;
    const messageContent = document.createElement('div');
    messageContent.className = 'max-w-3xl p-4 rounded-lg bg-gray-100 text-gray-800';
    messageContent.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-spinner spin text-blue-500 mr-3"></i>
            <span>${taskName}...</span>
        </div>
    `;
    messageDiv.appendChild(messageContent);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return messageDiv;
}

// Update task message to complete status
function updateTaskToComplete(taskElement, message) {
    const messageContent = taskElement.querySelector('div');
    messageContent.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle text-green-500 mr-3"></i>
            <span>${message}</span>
        </div>
    `;
    messageContent.className = 'max-w-3xl p-4 rounded-lg bg-green-100 text-green-800';
}

function simulateProcessing() {
    // New implementation: load content from uploaded dataset JSON files
    (async () => {
        if (!droppedFiles || droppedFiles.length === 0) {
            addMessage('ai', 'No files uploaded. Please drag the four JSON files (char.json, data.json, fr.json, qa.json) from a dataset folder in the left panel.');
            return;
        }

        // infer dataset ids from droppedFiles objects (folder property)
        const ids = Array.from(new Set(droppedFiles.map(f => f.folder).filter(Boolean)));

        for (const id of ids) {
            // Collect main information
            const mainInfoTask = addTaskLoadingMessage(`Collecting main information (${id})`);
            await sleep(1000);
            try {
                const resp = await fetch(`data/${id}/data.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const dataJson = await resp.json();
                updateTaskToComplete(mainInfoTask, 'Main information collected');
                await sleep(700);

                // Render main info in requested format
                const includedStudies = Array.isArray(dataJson.key_references) ? dataJson.key_references.length : (dataJson.key_references ? Object.keys(dataJson.key_references).length : 'N/A');
                const screened = dataJson.n_base || 'N/A';
                const sampleSize = dataJson.n_patients || 'N/A';
                const mainInfoContent = `# Research Main Information\n\n## Research Title\n${dataJson.title || id}\n\n## Research Objective\n${dataJson.question || ''}\n\n## Research Methodology\nNo. of included studies: ${includedStudies}\n\nNo. of screened studies: ${screened}\n\nSample size: ${sampleSize}`;
                addMessage('ai', mainInfoContent, true);
            } catch (err) {
                updateTaskToComplete(mainInfoTask, `Main information not available for ${id}`);
                addMessage('ai', `Could not load data.json for ${id}: ${err.message}`);
            }

            // Characteristic table
            const charTask = addTaskLoadingMessage(`Generating characteristic table (${id})`);
            await sleep(1000);
            try {
                const resp = await fetch(`data/${id}/char.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const charJson = await resp.json();
                updateTaskToComplete(charTask, 'Characteristic Table Generated');
                await sleep(700);
                if (charJson.table) addMessage('ai', charJson.table, true);
                else addMessage('ai', 'No characteristic table available.', false);
            } catch (err) {
                updateTaskToComplete(charTask, `Characteristic table not available for ${id}`);
                addMessage('ai', `Could not load char.json for ${id}: ${err.message}`);
            }

            // Forest plot
            const plotTask = addTaskLoadingMessage(`Generating forest plot (${id})`);
            await sleep(1000);
            try {
                const resp = await fetch(`data/${id}/fr.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const frJson = await resp.json();
                updateTaskToComplete(plotTask, 'Forest Plot Generated');
                await sleep(700);
                addMessage('ai', frJson.table, true);
            } catch (err) {
                updateTaskToComplete(plotTask, `Forest plot not available for ${id}`);
                addMessage('ai', `Could not load fr.json for ${id}: ${err.message}`);
            }

            // Quality assessment
            const qualityTask = addTaskLoadingMessage(`Generating quality assessment (${id})`);
            await sleep(1000);
            try {
                const resp = await fetch(`data/${id}/qa.json`);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const qaJson = await resp.json();
                updateTaskToComplete(qualityTask, 'Quality Assessment Generated');
                await sleep(700);
                let qaContent = '';
                if (qaJson.framework) qaContent += `## ${qaJson.framework}\n\n`;
                if (qaJson.table) qaContent += qaJson.table;
                if (qaJson.details) qaContent += '\n\n' + qaJson.details;
                if (qaContent) addMessage('ai', qaContent, true);
                else addMessage('ai', 'No quality assessment available.', false);
            } catch (err) {
                updateTaskToComplete(qualityTask, `Quality assessment not available for ${id}`);
                addMessage('ai', `Could not load qa.json for ${id}: ${err.message}`);
            }

            // Layman report
            const laymanTask = addTaskLoadingMessage(`Generating layman report (${id})`);
            await sleep(1000);
            try {
                const resp = await fetch(`data/${id}/report.json`);
                if (resp.ok) {
                    const reportJson = await resp.json();
                    // Determine best field to render
                    let reportContent = null;
                    if (typeof reportJson === 'string') reportContent = reportJson;
                    else if (reportJson.report) reportContent = reportJson.report;
                    else if (reportJson.markdown) reportContent = reportJson.markdown;
                    else if (reportJson.content) reportContent = reportJson.content;
                    else {
                        // If object contains a single string field, use it
                        const keys = Object.keys(reportJson);
                        if (keys.length === 1 && typeof reportJson[keys[0]] === 'string') reportContent = reportJson[keys[0]];
                    }

                    updateTaskToComplete(laymanTask, 'Layman Report Generated');
                    await sleep(700);
                    addMessage('ai', `# Layman Report\n\n${reportContent}`, true);
                }
            } catch (e) {
                updateTaskToComplete(laymanTask, `Layman Report not available for ${id}`);
                addMessage('ai', `Could not load report.json for ${id}: ${err.message}`);
            }
        }
    })();
}

// Initial welcome message
window.addEventListener('DOMContentLoaded', () => {
    addMessage('ai', 'Welcome to HiT-MAN Demo! Please drag 4 JSON files (char.json, data.json, fr.json, qa.json) to the upload area to begin.');
});