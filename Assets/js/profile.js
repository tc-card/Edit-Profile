import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles } from './utils.js';
import { logout } from './auth.js';

let unsavedChanges = false;

export async function loadProfileData() {
  if (state.profileData) {
    // Show dashboard and hide login screen
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Update sidebar with user info
    updateSidebar();
    
    // Render profile form
    renderProfileForm();
    addUnsavedChangesListener();
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
}

function updateSidebar() {
  const { profileData } = state;
  
  // Update sidebar profile info
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  const sidebarUserName = document.getElementById('sidebarUserName');
  
  if (profileData.profilePic) {
    sidebarProfilePic.src = profileData.profilePic;
    sidebarProfilePic.onerror = () => {
      sidebarProfilePic.src = 'https://tccards.tn/Assets/150.png';
    };
  }
  
  sidebarUserName.textContent = profileData.name || 'User';
  
  // Setup sidebar logout button
  document.getElementById('logoutBtnSidebar').addEventListener('click', logout);
}

function renderProfileForm() {
  const { profileData } = state;
  const lastEdit = profileData.timestamp ? new Date(profileData.timestamp) : null;
  const lastEditMessage = lastEdit ? `Last edited: ${lastEdit.toLocaleDateString(
    'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )}` : 'No edits yet';
  document.getElementById('publicProfileLink').href = `https://tccards.tn/@${encodeURIComponent(profileData.link || 'link')}`;
  
  DOM.profileEditor.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-4 bg-gray-700/50 rounded-lg">
      <div class="flex-1">
        <q class="text-xs text-gray-400 italic">${lastEditMessage}</q>
        <h1 class="text-2xl font-bold text-purple-400">${escapeHtml(profileData.name) || 'No Name'}</h1>
        <p class="text-gray-300">${escapeHtml(profileData.tagline) || ''}</p>
      </div>
      ${profileData.profilePic ? `
        <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0 bg-gray-700 animate-pulse">
          <img src="${escapeHtml(profileData.profilePic)}" 
               alt="Profile" 
               class="w-full h-full object-cover" 
               id="profileImagePreview"
               onload="this.parentElement.classList.remove('animate-pulse', 'bg-gray-700')"
               onerror="this.onerror=null;this.src='https://tccards.tn/Assets/150.png';this.parentElement.classList.remove('animate-pulse')">
        </div>
      ` : ''}
    </div>

    <form id="profileForm" class="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-live="polite">
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
            <input id="taglineInput" 
                   value="${escapeHtml(profileData.tagline) || ''}" 
                   type="text" 
                   name="tagline" 
                   maxlength="120"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                   oninput="document.getElementById('taglineCounter').textContent = 120 - this.value.length">
            <p class="text-xs text-gray-400 mt-1 text-right">
              <span id="taglineCounter">${120 - (profileData.tagline?.length || 0)}</span>/120 characters left
            </p>
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
            <label for="profilePicInput" class="block text-sm text-gray-300 mb-1">Profile Picture</label>
            <div class="flex items-center gap-2">
              <input id="profilePicInput" type="file" name="profilePicFile" accept="image/*"
                    class="hidden"
                    onchange="handleProfilePicUpload(this)">
              <button type="button" onclick="document.getElementById('profilePicInput').click()"
                      class="px-3 py-2 bg-gray-700 rounded border border-gray-600 hover:border-purple-500 text-sm">
                <i class="fas fa-upload mr-2"></i> Upload Image
              </button>
              <input type="hidden" id="profilePicUrl" name="profilePic" value="${escapeHtml(profileData.profilePic) || ''}">
              <span id="profilePicFilename" class="text-sm text-gray-400 truncate max-w-xs">
                ${profileData.profilePic ? 'Current image set' : 'No image selected'}
              </span>
            </div>
            <p class="text-xs text-gray-400 mt-1">Max 2MB (JPG, PNG, GIF)</p>
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

      <div class="lg:col-span-2 space-y-3">
        <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all">
          <span id="saveBtnText">Save Changes</span>
          <span id="saveSpinner" class="hidden ml-2"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
        <div id="saveStatus" aria-live="polite" class="text-center text-sm"></div>
        
        <a href="https://termination.tccards.tn/" 
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

// ... rest of the profile.js file remains the same ...
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "preset");

  try {
    const response = await fetch(
      "https://api.cloudinary.com/v1_1/dufg7fm4stt/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error("No secure URL returned");
    }
    return data.secure_url;
  } catch (error) {
    console.error("Image upload error:", error);
    throw error;
  }
}

window.handleProfilePicUpload = async function(input) {
  const file = input.files[0];
  if (!file) return;

  // Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    await showAlert('error', 'Invalid File', 'Please upload a JPG, PNG, or GIF image');
    return;
  }

  if (file.size > 2 * 1024 * 1024) { // 2MB
    await showAlert('error', 'File Too Large', 'Maximum file size is 2MB');
    return;
  }

  try {
    // Show uploading state
    const filenameEl = document.getElementById('profilePicFilename');
    filenameEl.textContent = 'Uploading...';
    filenameEl.classList.remove('text-gray-400');
    filenameEl.classList.add('text-blue-400');

    // Upload to Cloudinary
    const url = await uploadToCloudinary(file);
    
    // Update UI
    document.getElementById('profilePicUrl').value = url;
    filenameEl.textContent = file.name;
    filenameEl.classList.remove('text-blue-400');
    filenameEl.classList.add('text-green-400');
    
    // Update preview
    const preview = document.getElementById('profileImagePreview');
    if (preview) {
      preview.src = url;
      preview.onload = () => {
        preview.parentElement.classList.remove('animate-pulse', 'bg-gray-700');
      };
    }

    unsavedChanges = true;
    showSaveStatus('Image uploaded successfully!', 'text-green-400');
  } catch (error) {
    console.error('Upload error:', error);
    await showAlert('error', 'Upload Failed', 'Failed to upload image. Please try again.');
    
    const filenameEl = document.getElementById('profilePicFilename');
    filenameEl.textContent = 'Upload failed';
    filenameEl.classList.remove('text-blue-400', 'text-green-400');
    filenameEl.classList.add('text-red-400');
  }
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

  const profilePicInput = document.getElementById('profilePicInput');
  if (profilePicInput) {
    profilePicInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const preview = document.getElementById('profileImagePreview');
          if (preview) {
            preview.src = event.target.result;
            preview.parentElement.classList.remove('animate-pulse', 'bg-gray-700');
          }
        };
        reader.readAsDataURL(file);
      }
    });
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
    
    // If user clicks Cancel, prevent unload
    if (!confirm(e.returnValue)) {
      e.preventDefault();
      return false;
    }
    
    return e.returnValue;
  }
}

function initPhoneFormatting() {
  const phoneInput = document.getElementById('phoneInput');
  if (!phoneInput) return;

  phoneInput.addEventListener('input', (e) => {
    let numbers = e.target.value.replace(/\D/g, '');
    if (!numbers) {
      e.target.value = '';
      return;
    }

    const formatted = numbers.match(/.{1,3}/g)?.join(' ') || numbers;
    e.target.value = '+' + formatted;
    unsavedChanges = true;
  });
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
  let autoSaveEnabled = false;
  let debouncedSave;

  const autoSaveBtn = document.createElement('button');
  autoSaveBtn.type = 'button';
  autoSaveBtn.className = 'text-sm px-3 py-1 rounded-lg transition-all flex items-center gap-2 mb-4';
  autoSaveBtn.innerHTML = `
    <i class="fas fa-clock"></i>
    <span>Auto-save: Off</span>
  `;
  updateAutoSaveButtonStyle();
  
  form.parentElement.insertBefore(autoSaveBtn, form);

  autoSaveBtn.addEventListener('click', () => {
    autoSaveEnabled = !autoSaveEnabled;
    updateAutoSaveButtonStyle();
    
    if (autoSaveEnabled) {
      debouncedSave = debounce(() => {
        if (unsavedChanges) {
          form.dispatchEvent(new Event('submit'));
        }
      }, 10000);
      form.addEventListener('change', debouncedSave);
    } else {
      if (debouncedSave) {
        form.removeEventListener('change', debouncedSave);
      }
    }
  });

  function updateAutoSaveButtonStyle() {
    if (autoSaveEnabled) {
      autoSaveBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
      autoSaveBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
      autoSaveBtn.querySelector('span').textContent = 'Auto-save: On';
    } else {
      autoSaveBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
      autoSaveBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
      autoSaveBtn.querySelector('span').textContent = 'Auto-save: Off';
    }
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  // Clear previous error highlights
  form.querySelectorAll('.border-red-500').forEach(el => {
    el.classList.remove('border-red-500');
  });

  // Validation
  if (!formData.get('name')?.trim()) {
    form.querySelector('[name="name"]').classList.add('border-red-500');
    await showAlert('error', 'Validation Error', 'Name is required');
    return;
  }

  // Prepare update data
  const updateData = {
    name: escapeHtml(formData.get('name').trim()),
    tagline: escapeHtml(formData.get('tagline')?.trim()),
    phone: escapeHtml(formData.get('phone')?.trim()),
    address: escapeHtml(formData.get('address')?.trim()),
    profilePic: escapeHtml(formData.get('profilePic')?.trim()), // This comes from the hidden input
    socialLinks: Array.from(formData.getAll('socialLinks'))
      .map(link => escapeHtml(link.trim()))
      .filter(link => link)
  };

  try {
    // UI Loading State
    const saveBtn = form.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    showSaveStatus('Saving changes...', 'text-blue-400');

    // Verify session first (GET request)
    const verifyUrl = `${CONFIG.googleEditUrl}?action=verify_session&token=${state.currentUser.sessionToken}`;
    const verifyResponse = await fetch(verifyUrl);
    const sessionData = await verifyResponse.json();

    if (!sessionData.valid) {
      throw new Error('SESSION_EXPIRED');
    }

    // Prepare update URL (GET request)
    const updateUrl = `${CONFIG.googleEditUrl}?action=update_profile&token=${state.currentUser.sessionToken}&email=${encodeURIComponent(state.currentUser.email)}&data=${encodeURIComponent(JSON.stringify(updateData))}`;
    
    const updateResponse = await fetch(updateUrl);
    const result = await updateResponse.json();

    if (result.status !== 'success') {
      throw new Error(result.message || 'Save failed');
    }

    // Success handling
    unsavedChanges = false;
    state.profileData = { ...state.profileData, ...updateData };
    showSaveStatus('Changes saved successfully!', 'text-green-400');

  } catch (error) {
    console.error('Save error:', error);
    
    if (error.message.includes('SESSION_EXPIRED')) {
      await showAlert('error', 'Session Expired', 'Please log in again');
      logout();
      return;
    }
    
    await showAlert('error', 'Save Failed', error.message || 'Failed to save changes');
    showSaveStatus('Failed to save changes', 'text-red-400');
  } finally {
    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) saveBtn.disabled = false;
  }
}

function showSaveStatus(message, className = '') {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;
  
  // Clear any existing timeouts
  if (statusEl.timeoutId) {
    clearTimeout(statusEl.timeoutId);
  }

  // Add icon based on status type
  const icon = className.includes('green') ? '<i class="fas fa-check-circle"></i>' :
              className.includes('red') ? '<i class="fas fa-times-circle"></i>' :
              className.includes('blue') ? '<i class="fas fa-spinner fa-spin"></i>' :
              className.includes('yellow') ? '<i class="fas fa-exclamation-circle"></i>' : '';

  // Create wrapper if it doesn't exist
  if (!statusEl.querySelector('.status-wrapper')) {
    statusEl.innerHTML = '<div class="status-wrapper"></div>';
  }

  const wrapper = statusEl.querySelector('.status-wrapper');
  
  // Create new status element
  const newStatus = document.createElement('div');
  newStatus.className = 'flex items-center justify-center gap-2 absolute w-full transition-all duration-300';
  newStatus.innerHTML = `
    ${icon ? `<span class="text-lg">${icon}</span>` : ''}
    <span>${message}</span>
  `;

  // Position the new status
  if (wrapper.children.length) {
    newStatus.style.transform = 'translateY(20px)';
    newStatus.style.opacity = '0';
  }

  // Add base styles plus custom classes
  statusEl.className = `text-center text-sm p-2 rounded-lg transition-all duration-300 relative overflow-hidden ${className}`;
  wrapper.style.position = 'relative';
  wrapper.style.height = '24px'; // Fixed height to prevent jumping

  // Add new status
  wrapper.appendChild(newStatus);

  // Trigger transition
  requestAnimationFrame(() => {
    // Fade out old status if exists
    if (wrapper.children.length > 1) {
      const oldStatus = wrapper.children[0];
      oldStatus.style.transform = 'translateY(-20px)';
      oldStatus.style.opacity = '0';
      
      setTimeout(() => oldStatus.remove(), 300);
    }

    // Fade in new status
    newStatus.style.transform = 'translateY(0)';
    newStatus.style.opacity = '1';
  });

  // Auto-hide success and info messages
  if (className.includes('green') || className.includes('blue')) {
    statusEl.timeoutId = setTimeout(() => {
      newStatus.style.transform = 'translateY(-20px)';
      newStatus.style.opacity = '0';
      
      setTimeout(() => {
        wrapper.innerHTML = '';
        statusEl.className = 'text-center text-sm';
      }, 300);
    }, 3000);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return unsafe;
  return unsafe.toString()
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