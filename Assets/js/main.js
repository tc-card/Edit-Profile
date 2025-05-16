import { CONFIG, DOM } from './config.js';
import { currentUser } from './auth.js';

// Initialize modals
function initModals() {
  // Modal toggle functions
  window.openEditModal = (modalId) => {
    document.getElementById(modalId).classList.remove('invisible', 'opacity-0');
    document.getElementById(modalId).classList.add('opacity-100');
  };

  window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.add('invisible', 'opacity-0');
    document.getElementById(modalId).classList.remove('opacity-100');
  };

  // Close modals when clicking outside
  document.querySelectorAll('[id$="Modal"]').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

// Load profile data
async function loadProfileData() {
  try {
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=get_profile&email=${encodeURIComponent(currentUser.email)}`, {
      headers: {
        'Authorization': `Bearer ${currentUser.sessionToken}`
      }
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.message);
    
    renderProfile(data);
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Failed to load profile data');
  }
}

// Render profile data
function renderProfile(data) {
  // Update profile header
  DOM.profileName.textContent = data.Name || 'No name provided';
  DOM.profileTitleLocation.textContent = `${data.Title || ''}${data.Title && data.Location ? ' | ' : ''}${data.Location || ''}`;
  
  // Update personal info
  DOM.profileEmail.textContent = data.Email || 'No email provided';
  DOM.profilePhone.textContent = data.Phone || 'No phone provided';
  DOM.profileAddress.textContent = data.Address || 'No address provided';
  
  // Update social links
  const socialLinksContainer = DOM.socialLinksContainer;
  socialLinksContainer.innerHTML = '';
  
  const links = data['Social Links'] ? data['Social Links'].split('\n').filter(Boolean) : [];
  
  if (links.length === 0) {
    socialLinksContainer.innerHTML = '<p class="text-gray-400">No social links added yet</p>';
  } else {
    links.forEach(link => {
      const domain = link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      const platform = domain.charAt(0).toUpperCase() + domain.slice(1);
      
      const linkElement = document.createElement('div');
      linkElement.className = 'flex items-center p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700/80 transition-colors';
      linkElement.innerHTML = `
        <span class="text-orange-400 min-w-[100px]">${platform}</span>
        <a href="${link}" target="_blank" class="text-blue-400 hover:underline break-all">${link}</a>
      `;
      socialLinksContainer.appendChild(linkElement);
    });
  }
}

// Initialize the application
function initApp() {
  initModals();
  
  // Check if user is already authenticated
  if (currentUser.sessionToken) {
    DOM.loginScreen.classList.add('hidden');
    DOM.profileEditor.classList.remove('hidden');
    loadProfileData();
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);