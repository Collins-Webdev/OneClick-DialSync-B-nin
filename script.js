// Sélection des éléments du DOM
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const downloadBtn = document.getElementById('downloadBtn');
const resultSection = document.querySelector('.result-section');
const totalContactsSpan = document.getElementById('totalContacts');
const updatedContactsSpan = document.getElementById('updatedContacts');
const modal = document.getElementById('notificationModal');
const modalMessage = document.getElementById('modalMessage');
const closeModal = document.querySelector('.close');

// Variables pour stocker les données de traitement
let processedVcf = null;
let statistics = {
    totalContacts: 0,
    updatedNumbers: 0
};

// Événements pour le drag & drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
});

// Événement pour la sélection de fichier classique
fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

// Gestion du modal
closeModal.onclick = () => modal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
};

// Fonction principale de traitement du fichier
async function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.vcf')) {
        showNotification('Veuillez sélectionner un fichier VCF valide', 'error');
        return;
    }

    showLoading();
    showNotification('Traitement de vos contacts en cours...', 'info');

    try {
        const content = await readFile(file);
        processVcf(content);
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('Une erreur est survenue lors du traitement', 'error');
    }
}

// Lecture du fichier
function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Traitement du fichier VCF
function processVcf(content) {
    // Réinitialisation des statistiques
    statistics.totalContacts = 0;
    statistics.updatedNumbers = 0;

    // Traitement des contacts
    const contacts = content.split('BEGIN:VCARD').filter(contact => contact.trim());
    processedVcf = contacts.map(contact => processContact(contact)).join('\n');

    // Mise à jour de l'interface
    updateUI();
    showNotification(`${statistics.updatedNumbers} numéros mis à jour avec succès !`, 'success');
}

// Traitement d'un contact individuel
function processContact(contact) {
    statistics.totalContacts++;
    
    // Séparation des lignes du contact
    let lines = ('BEGIN:VCARD' + contact).split('\n');
    
    // Traitement de chaque ligne
    lines = lines.map(line => {
        if (line.trim().startsWith('TEL')) {
            const [prefix, number] = line.split(':');
            if (number) {
                const processedNumber = processPhoneNumber(number.trim());
                if (processedNumber !== number) {
                    statistics.updatedNumbers++;
                }
                return `${prefix}:${processedNumber}`;
            }
        }
        return line;
    });

    // S'assurer que END:VCARD est sur une nouvelle ligne
    return lines.filter(line => line.trim()).join('\n');
}

// Traitement d'un numéro de téléphone
function processPhoneNumber(number) {
    // Nettoyage du numéro
    let cleaned = number.replace(/[\s-]/g, '');

    // Cas 1: Numéro avec +229
    if (cleaned.startsWith('+229')) {
        const nationalNumber = cleaned.substring(4);
        if (/^\d{8}$/.test(nationalNumber)) {
            return '+22901' + nationalNumber;
        }
        return cleaned;
    }

    // Cas 2: Numéro local 8 chiffres
    if (/^\d{8}$/.test(cleaned)) {
        return '+22901' + cleaned;
    }

    return number;
}

// Mise à jour de l'interface utilisateur
function updateUI() {
    totalContactsSpan.textContent = statistics.totalContacts;
    updatedContactsSpan.textContent = statistics.updatedNumbers;
    resultSection.style.display = 'block';

    // Activation du bouton de téléchargement
    downloadBtn.onclick = downloadProcessedFile;
}

// Téléchargement du fichier traité
function downloadProcessedFile() {
    if (!processedVcf) {
        showNotification('Aucun fichier à télécharger', 'error');
        return;
    }

    const blob = new Blob([processedVcf], { type: 'text/x-vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_mis_a_jour.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Gestion des notifications
function showNotification(message, type = 'info') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    modalMessage.innerHTML = `
        <div class="notification ${type}">
            <i class="fas ${icons[type]}"></i>
            <p>${message}</p>
        </div>
    `;
    modal.style.display = 'block';
}

// Gestion du loader
function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loading';
    dropZone.appendChild(loader);
    dropZone.classList.add('processing');
}

function hideLoading() {
    const loader = dropZone.querySelector('.loading');
    if (loader) {
        loader.remove();
        dropZone.classList.remove('processing');
    }
}