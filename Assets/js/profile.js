import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles } from './utils.js';
import { logout } from './auth.js';

// Track unsaved changes
let unsavedChanges = false;

export async function loadProfileData() {
  if (state.profileData) {
    renderProfileForm();
    addUnsavedChangesListener();
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
}

function renderProfileForm() {
  const { profileData } = state;

  DOM.profileEditor.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-purple-400">Edit Profile</h1>
      <button id="logoutBtn" class="text-red-400 hover:text-red-300 flex items-center gap-1" aria-label="Logout">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>

    <div class="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
      <div class="flex flex-col md:flex-row md:items-center gap-6">
        <div class="flex-1 text-center md:text-left">
          <h1 class="text-2xl font-bold text-purple-400">${escapeHtml(profileData.name) || 'No Name'}</h1>
          <p class="text-gray-300">${escapeHtml(profileData.tagline) || ''}</p>
          ${profileData.link ? `
            <p class="mt-2">
              <a href="https://card.tccards.tn/profile/@${escapeHtml(profileData.link)}" 
                 target="_blank" 
                 class="text-blue-400 hover:underline"
                 aria-label="View public profile">
                View Public Profile
              </a>
            </p>
          ` : ''}
        </div>
        ${profileData.profilePic ? `
          <div class="w-32 h-32 mx-auto md:mx-0 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0 bg-gray-700 animate-pulse">
            <img src="${escapeHtml(profileData.profilePic)}" 
                 alt="Profile" 
                 class="w-full h-full object-cover" 
                 id="profileImagePreview"
                 onload="this.parentElement.classList.remove('animate-pulse', 'bg-gray-700')"
                 onerror="this.onerror=null;this.src='https://tccards.tn/Assets/150.png';this.parentElement.classList.remove('animate-pulse')">
          </div>
        ` : ''}
      </div>
    </div>

    <form id="profileForm" class="grid grid-cols-1 md:grid-cols-2 gap-6" aria-live="polite">
      <!-- Personal Info Section -->
      <div style="${styles[profileData.style]?.background || 'background-color: #2d3748'}" class="rounded-xl p-6 shadow-lg">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Personal Information</h2>
        <div class="space-y-4">
          <div>
            <label for="nameInput" class="block text-sm text-gray-300 mb-1">Name *</label>
            <input id="nameInput" type="text" name="name" value="${escapeHtml(profileData.name) || ''}" required
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
          </div>
          <div>
            <label for="taglineInput" class="block text-sm text-gray-300 mb-1">Tagline</label>
            <input id="taglineInput" type="text" name="tagline" value="${escapeHtml(profileData.tagline) || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
          </div>
          <div>
            <label for="phoneInput" class="block text-sm text-gray-300 mb-1">Phone</label>
            <input id="phoneInput" type="tel" name="phone" value="${escapeHtml(profileData.phone) || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                   pattern="[0-9\s+-]{10,}">
            <p class="text-xs text-gray-400 mt-1">Format: (123) 456-7890</p>
          </div>
          <div>
            <label for="addressInput" class="block text-sm text-gray-300 mb-1">Address</label>
            <textarea id="addressInput" name="address" 
                      class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">${escapeHtml(profileData.address) || ''}</textarea>
          </div>
          <div>
            <label for="profilePicInput" class="block text-sm text-gray-300 mb-1">Profile Picture URL</label>
            <input id="profilePicInput" type="url" name="profilePic" value="${escapeHtml(profileData.profilePic) || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                   pattern="https?://.+\.(jpg|jpeg|png|webp|gif)">
            <p class="text-xs text-gray-400 mt-1">Must be a direct image URL (jpg, png, etc.)</p>
          </div>
        </div>
      </div>

      <!-- Social Links Section -->
      <div style="${styles[profileData.style]?.background || 'background-color: #2d3748'}" class="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-purple-400">Social Links</h2>
          <button type="button" id="addSocialLink" 
                  class="text-purple-400 hover:text-purple-300"
                  aria-label="Add social link">
            <i class="fas fa-plus mr-1"></i> Add
          </button>
        </div>
        <div id="socialLinksContainer" class="space-y-3">
          ${(profileData.socialLinks || []).map(link => `
            <div class="flex items-center gap-2">
              <input type="url" name="socialLinks" value="${escapeHtml(link)}" 
                     class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                     pattern="https?://.+">
              <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2"
                      aria-label="Remove social link">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `).join('')}
        </div>
        <p class="text-xs text-gray-400 mt-2">${CONFIG.maxSocialLinks - (profileData.socialLinks?.length || 0)} links remaining</p>
      </div>

      <div class="md:col-span-2 space-y-3">
        <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all">
          <span id="saveBtnText">Save Changes</span>
          <span id="saveSpinner" class="hidden ml-2"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
        <div id="saveStatus" aria-live="polite" class="text-center text-sm"></div>
        
        <a href="https://card.tccards.tn/termination" 
           target="_blank" 
           class="block w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg text-center transition-all"
           aria-label="Delete account">
          <i class="fas fa-trash-alt mr-2"></i> Delete Account
        </a>
      </div>
    </form>
  `;

  setupProfileFormEvents();
  setupAutoSave();
  initPhoneFormatting();
}

function setupProfileFormEvents() {
  const form = document.getElementById('profileForm');
  form.addEventListener('submit', handleSaveProfile);
  
  document.getElementById('addSocialLink').addEventListener('click', addSocialLink);
  
  document.querySelectorAll('.remove-link-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.target.closest('div').remove();
      unsavedChanges = true;
      updateRemainingLinks();
    });
  });

  // Profile picture preview with debounce
  const profilePicInput = document.getElementById('profilePicInput');
  if (profilePicInput) {
    profilePicInput.addEventListener('input', debounce((e) => {
      const preview = document.getElementById('profileImagePreview');
      if (preview && isValidUrl(e.target.value)) {
        preview.src = e.target.value;
        unsavedChanges = true;
      }
    }, 500));
  }

  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function addUnsavedChangesListener() {
  const form = document.getElementById('profileForm');
  form.addEventListener('change', () => {
    unsavedChanges = true;
    showSaveStatus('You have unsaved changes', 'text-yellow-400');
  });
}

function handleBeforeUnload(e) {
  if (unsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
}

function initPhoneFormatting() {
  const phoneInput = document.getElementById('phoneInput');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      const numbers = e.target.value.replace(/\D/g, '');
      const char = {3:'-',6:'-'};
      e.target.value = numbers.slice(0,10).split('').map((n,i) => char[i] ? char[i]+n : n).join('');
      unsavedChanges = true;
    });
  }
}

function addSocialLink() {
  const container = document.getElementById('socialLinksContainer');
  const currentCount = container.querySelectorAll('input').length;

  if (currentCount >= CONFIG.maxSocialLinks) {
    showAlert('info', 'Maximum Reached', 
      `You can add up to ${CONFIG.maxSocialLinks} links. Consider upgrading your plan.`,
      { icon: 'fas fa-info-circle', duration: 3000 }
    );
    return;
  }

  const div = document.createElement('div');
  div.className = 'flex items-center gap-2';
  div.innerHTML = `
    <input type="url" name="socialLinks" placeholder="https://example.com"
           class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
           pattern="https?://.+">
    <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2"
            aria-label="Remove social link">
      <i class="fas fa-times"></i>
    </button>
  `;
  div.querySelector('.remove-link-btn').addEventListener('click', () => {
    div.remove();
    unsavedChanges = true;
    updateRemainingLinks();
  });
  container.appendChild(div);
  updateRemainingLinks();
  unsavedChanges = true;
}

function updateRemainingLinks() {
  const container = document.getElementById('socialLinksContainer');
  const count = container.querySelectorAll('input').length;
  const remaining = CONFIG.maxSocialLinks - count;
  const statusEl = container.nextElementSibling;
  if (statusEl) {
    statusEl.textContent = `${remaining} links remaining`;
    statusEl.className = `text-xs ${remaining < 3 ? 'text-yellow-400' : 'text-gray-400'} mt-2`;
  }
}

function setupAutoSave() {
  const form = document.getElementById('profileForm');
  const debouncedSave = debounce(() => {
    if (unsavedChanges) {
      form.dispatchEvent(new Event('submit'));
    }
  }, 10000); // Auto-save after 10 seconds of inactivity

  form.addEventListener('change', debouncedSave);
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  // Validation
  if (!formData.get('name')?.trim()) {
    form.querySelector('[name="name"]').classList.add('border-red-500');
    await showAlert('error', 'Validation Error', 'Name is required');
    return;
  }

  if (formData.get('phone') && !/^[\d\s+-]{10,}$/.test(formData.get('phone'))) {
    form.querySelector('[name="phone"]').classList.add('border-red-500');
    await showAlert('error', 'Invalid Phone', 'Please enter a valid phone number');
    return;
  }

  const updateData = {
    name: escapeHtml(formData.get('name').trim()),
    tagline: escapeHtml(formData.get('tagline')?.trim()),
    phone: escapeHtml(formData.get('phone')?.trim()),
    address: escapeHtml(formData.get('address')?.trim()),
    profilePic: escapeHtml(formData.get('profilePic')?.trim()),
    socialLinks: Array.from(formData.getAll('socialLinks'))
      .map(link => escapeHtml(link.trim()))
      .filter(link => link && isValidUrl(link))
  };

  try {
    const saveBtn = form.querySelector('button[type="submit"]');
    const saveText = saveBtn.querySelector('#saveBtnText');
    const spinner = saveBtn.querySelector('#saveSpinner');
    
    saveBtn.disabled = true;
    saveText.textContent = 'Saving...';
    spinner.classList.remove('hidden');
    showSaveStatus('Saving changes...', 'text-blue-400');

    const response = await fetch(`${CONFIG.googleScriptUrl}?action=update_profile&token=${state.currentUser.sessionToken}&email=${encodeURIComponent(state.currentUser.email)}&data=${encodeURIComponent(JSON.stringify(updateData))}`);
    const data = await response.json();

    if (data.status === 'success') {
      unsavedChanges = false;
      showSaveStatus('Changes saved successfully!', 'text-green-400');
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSaveStatus('', '');
      state.profileData = { ...state.profileData, ...updateData };
    } else {
      throw new Error(data.message || 'Save failed');
    }
  } catch (error) {
    showSaveStatus('Failed to save changes', 'text-red-400');
    await showAlert('error', 'Error', error.message);
    if (error.message.includes('session') || error.message.includes('token')) {
      logout();
    }
  } finally {
    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.querySelector('#saveBtnText').textContent = 'Save Changes';
      saveBtn.querySelector('#saveSpinner').classList.add('hidden');
    }
  }
}

function showSaveStatus(message, className = '') {
  const statusEl = document.getElementById('saveStatus');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `text-center text-sm ${className}`;
  }
}

function escapeHtml(unsafe) {
  if (!unsafe || typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}