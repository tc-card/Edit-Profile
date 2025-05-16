import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './auth.js';

export async function loadProfileData() {
  try {
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=get_profile&email=${encodeURIComponent(state.currentUser.email)}`, {
      headers: {
        'Authorization': `Bearer ${state.currentUser.sessionToken}`
      }
    });
    const data = await response.json();
    
    if (data.error) throw new Error(data.message);
    
    state.currentUser.profileData = data;
    renderProfile();
    return true;
  } catch (error) {
    await showAlert('error', 'Load Failed', error.message || 'Failed to load profile data');
    return false;
  }
}

function renderProfile() {
  const { Name, Title, Location, Email, Phone, Address, 'Social Links': socialLinks } = state.currentUser.profileData;
  
  // Profile Header
  DOM.profileEditor.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between">
        <div class="mb-4 md:mb-0">
          <h1 class="text-2xl font-bold text-purple-400">${Name || 'No name'}</h1>
          <p class="text-gray-400">${Title || ''}${Title && Location ? ' | ' : ''}${Location || ''}</p>
        </div>
        <div class="flex space-x-3">
          <button onclick="window.editPersonalInfo()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Info -->
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 class="text-xl font-semibold text-blue-400 mb-4">Personal Information</h2>
        <div class="space-y-4">
          <div>
            <p class="text-sm text-gray-400">Email</p>
            <p class="text-white">${Email || 'Not provided'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Phone</p>
            <p class="text-white">${Phone || 'Not provided'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">Address</p>
            <p class="text-white">${Address || 'Not provided'}</p>
          </div>
        </div>
      </div>
      
      <!-- Social Links -->
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-blue-400">Social Links</h2>
          <button onclick="window.editSocialLinks()" class="text-blue-400 hover:text-blue-300">
            <i class="fas fa-edit"></i> Edit
          </button>
        </div>
        <div id="socialLinksContainer" class="space-y-3">
          ${renderSocialLinks(socialLinks)}
        </div>
      </div>
    </div>
  `;
  
  // Initialize modals
  initModals();
}

function renderSocialLinks(links) {
  if (!links) return '<p class="text-gray-400">No social links added</p>';
  
  const linksArray = links.split('\n').filter(Boolean);
  if (linksArray.length === 0) return '<p class="text-gray-400">No social links added</p>';
  
  return linksArray.map(link => {
    const domain = link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const platform = domain.charAt(0).toUpperCase() + domain.slice(1);
    
    return `
      <div class="flex items-center p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/80 transition-colors">
        <span class="text-orange-400 min-w-[100px]">${platform}</span>
        <a href="${link}" target="_blank" class="text-blue-400 hover:underline break-all">${link}</a>
      </div>
    `;
  }).join('');
}

function initModals() {
  // Personal Info Modal
  state.modals.personalInfo = document.createElement('div');
  state.modals.personalInfo.id = 'personalInfoModal';
  state.modals.personalInfo.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal';
  state.modals.personalInfo.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md modal-content">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-purple-400">Edit Personal Info</h3>
        <button onclick="window.closeModal('personalInfo')" class="text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form id="personalInfoForm" class="space-y-4">
        <!-- Form fields will be added dynamically -->
      </form>
    </div>
  `;
  
  // Social Links Modal
  state.modals.socialLinks = document.createElement('div');
  state.modals.socialLinks.id = 'socialLinksModal';
  state.modals.socialLinks.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50 modal';
  state.modals.socialLinks.innerHTML = `
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md modal-content">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-purple-400">Edit Social Links</h3>
        <button onclick="window.closeModal('socialLinks')" class="text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <form id="socialLinksForm" class="space-y-4">
        <div id="socialLinkInputs" class="space-y-3"></div>
        <button type="button" onclick="window.addSocialLink()" class="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg">
          <i class="fas fa-plus mr-2"></i> Add Link
        </button>
        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" onclick="window.closeModal('socialLinks')" class="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(state.modals.personalInfo);
  document.body.appendChild(state.modals.socialLinks);
}

// Window functions
window.editPersonalInfo = function() {
  const { Name, Title, Location, Email, Phone, Address } = state.currentUser.profileData;
  
  const form = document.getElementById('personalInfoForm');
  form.innerHTML = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm text-gray-400 mb-1">Full Name</label>
        <input type="text" id="editName" value="${Name || ''}" class="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600">
      </div>
      <!-- Other fields -->
    </div>
    <div class="flex justify-end space-x-3 pt-4">
      <button type="button" onclick="window.closeModal('personalInfo')" class="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-700">
        Cancel
      </button>
      <button type="submit" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
        Save Changes
      </button>
    </div>
  `;
  
  state.modals.personalInfo.classList.add('active');
};

window.editSocialLinks = function() {
  const links = state.currentUser.profileData['Social Links']?.split('\n').filter(Boolean) || [];
  const container = document.getElementById('socialLinkInputs');
  container.innerHTML = '';
  
  links.forEach(link => {
    addSocialLinkInput(link);
  });
  
  state.modals.socialLinks.classList.add('active');
};

window.addSocialLink = function() {
  addSocialLinkInput();
};

window.closeModal = function(modalName) {
  state.modals[modalName].classList.remove('active');
};

function addSocialLinkInput(link = '') {
  const container = document.getElementById('socialLinkInputs');
  const div = document.createElement('div');
  div.className = 'flex items-center space-x-2';
  div.innerHTML = `
    <select class="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg">
      <option value="custom">Custom</option>
      ${Object.entries(CONFIG.socialPlatforms).map(([key, url]) => 
        `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`
      ).join('')}
    </select>
    <input type="url" value="${link}" placeholder="https://example.com" class="flex-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg">
    <button type="button" onclick="this.parentElement.remove()" class="text-red-400 hover:text-red-300">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(div);
}

export async function saveProfile(formData) {
  try {
    const response = await fetch(CONFIG.googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'update_profile',
        sessionToken: state.currentUser.sessionToken,
        ...formData
      })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      await showAlert('success', 'Updated', 'Profile saved successfully');
      await loadProfileData();
      return true;
    } else {
      throw new Error(data.message || 'Update failed');
    }
  } catch (error) {
    await showAlert('error', 'Error', error.message || 'Failed to save profile');
    return false;
  }
}