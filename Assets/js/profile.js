import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles } from './utils.js';
import { logout } from './auth.js';

let unsavedChanges = false;
let autoSaveEnabled = false;
let debouncedAutoSave;

export async function loadProfileData() {
  if (!state.profileData) return;

  // Show dashboard and hide login screen
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  
  // Update sidebar with user info
  updateSidebar();
  
  // Render profile form
  renderProfileForm();
  setupEventListeners();
}

function updateSidebar() {
  const { profileData } = state;
  
  const sidebarProfilePic = document.getElementById('sidebarProfilePic');
  const sidebarUserName = document.getElementById('sidebarUserName');
  
  if (profileData.profilePic) {
    sidebarProfilePic.src = profileData.profilePic;
    sidebarProfilePic.onerror = () => {
      sidebarProfilePic.src = 'https://tccards.tn/Assets/150.png';
    };
  }
  
  sidebarUserName.textContent = profileData.name || 'User';
  document.getElementById('logoutBtnSidebar').addEventListener('click', logout);
}

function renderProfileForm() {
  const { profileData } = state;
  const lastEdit = profileData.timestamp ? new Date(profileData.timestamp) : null;
  const lastEditMessage = lastEdit ? 
    `Last edited: ${lastEdit.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : 
    'No edits yet';

  DOM.profileEditor.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-4 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/30">
      <div class="flex-1">
        <q class="text-xs text-gray-400 italic">${lastEditMessage}</q>
        <h1 class="text-2xl font-bold text-purple-400">${escapeHtml(profileData.name) || 'No Name'}</h1>
        <p class="text-gray-300">${escapeHtml(profileData.tagline) || ''}</p>
      </div>
      ${renderProfileImage(profileData.profilePic)}
    </div>

    <div class="mb-4">
      <button type="button" id="autoSaveToggle" class="text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 bg-gray-700 hover:bg-gray-600">
        <i class="fas fa-clock"></i>
        <span>Auto-save: Off</span>
      </button>
    </div>

    <form id="profileForm" class="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-live="polite">
      ${renderPersonalInfoSection(profileData)}
      ${renderSocialLinksSection(profileData)}
      
      <div class="lg:col-span-2 space-y-3">
        <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <span id="saveBtnText">Save Changes</span>
          <span id="saveSpinner" class="hidden ml-2"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
        <div id="saveStatus" aria-live="polite" class="text-center text-sm min-h-[24px]"></div>
        
        <a href="https://termination.tccards.tn/" target="_blank" 
           class="block w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg text-center transition-all">
          <i class="fas fa-trash-alt mr-2"></i> Delete Account
        </a>
      </div>
    </form>
  `;

  initializeForm();
}

function renderProfileImage(profilePic) {
  if (!profilePic) return '';
  
  // DON'T escape URLs - they need to stay intact
  return `
    <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0 bg-gray-700">
      <img src="${profilePic}" 
           alt="Profile" 
           class="w-full h-full object-cover" 
           id="profileImagePreview"
           onerror="this.src='https://tccards.tn/Assets/150.png'">
    </div>
  `;
}

function renderPersonalInfoSection(profileData) {
  const backgroundStyle = styles[profileData.style]?.background || 'background-color: #2d3748';
  const taglineLength = profileData.tagline?.length || 0;

  return `
    <div style="${backgroundStyle}" class="rounded-xl p-6 shadow-lg">
      <h2 class="text-xl font-semibold text-purple-400 mb-4">Personal Information</h2>
      <div class="space-y-4">
        <div>
          <label for="nameInput" class="block text-sm text-gray-300 mb-1">Name *</label>
          <input id="nameInput" type="text" name="name" value="${escapeHtml(profileData.name) || ''}" required
                 class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
        </div>
        
        <div>
          <label for="taglineInput" class="block text-sm text-gray-300 mb-1">Tagline</label>
          <input id="taglineInput" type="text" name="tagline" value="${escapeHtml(profileData.tagline) || ''}" 
                 maxlength="120" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          <p class="text-xs text-gray-400 mt-1 text-right">
            <span id="taglineCounter">${120 - taglineLength}</span>/120 characters left
          </p>
        </div>
        
        <div>
          <label for="phoneInput" class="block text-sm text-gray-300 mb-1">Phone</label>
          <input id="phoneInput" type="tel" name="phone" value="${escapeHtml(profileData.phone) || ''}"
                 class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          <p class="text-xs text-gray-400 mt-1">Format: +123 456 7890</p>
        </div>
        
        <div>
          <label for="addressInput" class="block text-sm text-gray-300 mb-1">Address</label>
          <textarea id="addressInput" name="address" rows="3"
                    class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors resize-none">${escapeHtml(profileData.address) || ''}</textarea>
        </div>
        
        <div>
          <label class="block text-sm text-gray-300 mb-1">Profile Picture</label>
          <div class="flex items-center gap-2">
            <input type="file" id="profilePicInput" accept="image/*" class="hidden">
            <button type="button" id="uploadImageBtn" 
                    class="px-4 py-2 bg-gray-700 rounded border border-gray-600 hover:border-purple-500 text-sm transition-colors">
              <i class="fas fa-upload mr-2"></i> Upload Image
            </button>
            <input type="hidden" id="profilePicUrl" value="${profileData.profilePic || ''}">
            <span id="profilePicStatus" class="text-sm text-gray-400 truncate max-w-xs">
              ${profileData.profilePic ? 'Image set' : 'No image selected'}
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-1">Max 2MB (JPG, PNG, GIF, WEBP)</p>
        </div>
      </div>
    </div>
  `;
}

function renderSocialLinksSection(profileData) {
  const backgroundStyle = styles[profileData.style]?.background || 'background-color: #2d3748';
  const socialLinks = profileData.socialLinks || [];
  const remainingLinks = CONFIG.maxSocialLinks - socialLinks.length;

  return `
    <div style="${backgroundStyle}" class="rounded-xl p-6 shadow-lg">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-purple-400">Social Links</h2>
        <button type="button" id="addSocialLink" class="text-purple-400 hover:text-purple-300 transition-colors">
          <i class="fas fa-plus mr-1"></i> Add
        </button>
      </div>
      <div id="socialLinksContainer" class="space-y-3">
        ${socialLinks.map((link, index) => `
          <div class="social-link-item flex items-center gap-2" data-index="${index}">
            <button type="button" class="handle text-gray-400 hover:text-gray-300 cursor-move px-2 transition-colors" title="Drag to reorder">
              <i class="fas fa-grip-vertical"></i>
            </button>
            <input type="url" name="socialLinks" value="${escapeHtml(link)}" 
                   class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                   placeholder="https://example.com">
            <button type="button" class="remove-social-link text-red-400 hover:text-red-300 px-2 transition-colors">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('')}
      </div>
      <p class="text-xs ${remainingLinks < 3 ? 'text-yellow-400' : 'text-gray-400'} mt-2">
        ${remainingLinks} links remaining
      </p>
    </div>
  `;
}

function initializeForm() {
  setupFormEvents();
  initPhoneFormatting();
  setupAutoSaveToggle();
  addUnsavedChangesListener();
  initSortableLinks();
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupFormEvents() {
  const form = document.getElementById('profileForm');
  form.addEventListener('submit', handleSaveProfile);
  
  // Profile picture upload
  document.getElementById('uploadImageBtn').addEventListener('click', () => {
    document.getElementById('profilePicInput').click();
  });
  
  document.getElementById('profilePicInput').addEventListener('change', handleProfilePicUpload);
  
  // Social links
  document.getElementById('addSocialLink').addEventListener('click', addSocialLink);
  
  // Tagline counter
  document.getElementById('taglineInput').addEventListener('input', updateTaglineCounter);
}

function setupAutoSaveToggle() {
  const autoSaveBtn = document.getElementById('autoSaveToggle');
  autoSaveBtn.addEventListener('click', toggleAutoSave);
}

function toggleAutoSave() {
  autoSaveEnabled = !autoSaveEnabled;
  const autoSaveBtn = document.getElementById('autoSaveToggle');
  const span = autoSaveBtn.querySelector('span');
  
  if (autoSaveEnabled) {
    autoSaveBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
    autoSaveBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
    span.textContent = 'Auto-save: On';
    
    // Setup auto-save debounce
    debouncedAutoSave = debounce(() => {
      if (unsavedChanges) {
        document.getElementById('profileForm').dispatchEvent(new Event('submit'));
      }
    }, 5000);
    
    document.getElementById('profileForm').addEventListener('input', debouncedAutoSave);
  } else {
    autoSaveBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
    autoSaveBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
    span.textContent = 'Auto-save: Off';
    
    if (debouncedAutoSave) {
      document.getElementById('profileForm').removeEventListener('input', debouncedAutoSave);
    }
  }
}

function initSortableLinks() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;

  let draggedItem = null;

  // Add event listeners for drag and drop
  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.handle')) {
      draggedItem = e.target.closest('.social-link-item');
      if (!draggedItem) return;

      draggedItem.style.opacity = '0.5';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  });

  function onMouseMove(e) {
    if (!draggedItem) return;

    const items = [...container.querySelectorAll('.social-link-item:not(.dragging)')];
    const afterElement = getDragAfterElement(container, e.clientY);
    
    if (afterElement) {
      container.insertBefore(draggedItem, afterElement);
    } else {
      container.appendChild(draggedItem);
    }
  }

  function onMouseUp() {
    if (draggedItem) {
      draggedItem.style.opacity = '1';
      draggedItem = null;
      markUnsavedChanges();
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.social-link-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Touch support for mobile
  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.handle')) {
      draggedItem = e.target.closest('.social-link-item');
      if (!draggedItem) return;

      draggedItem.style.opacity = '0.5';
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    }
  });

  function onTouchMove(e) {
    if (!draggedItem) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const items = [...container.querySelectorAll('.social-link-item:not(.dragging)')];
    const afterElement = getDragAfterElement(container, touch.clientY);
    
    if (afterElement) {
      container.insertBefore(draggedItem, afterElement);
    } else {
      container.appendChild(draggedItem);
    }
  }

  function onTouchEnd() {
    if (draggedItem) {
      draggedItem.style.opacity = '1';
      draggedItem = null;
      markUnsavedChanges();
    }
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }
}

async function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    await showAlert('error', 'Invalid File', 'Please upload a JPG, PNG, GIF, or WEBP image');
    event.target.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    await showAlert('error', 'File Too Large', 'Maximum file size is 2MB');
    event.target.value = '';
    return;
  }

  try {
    updateProfilePicStatus('Uploading...', 'text-blue-400');
    
    const url = await uploadToCloudinary(file);
    console.log('Cloudinary URL:', url);
    
    // Update the hidden input with the new URL
    document.getElementById('profilePicUrl').value = url;
    
    // Update preview
    const preview = document.getElementById('profileImagePreview');
    if (preview) {
      preview.src = url;
    } else {
      // Create preview if it doesn't exist
      const profileSection = document.querySelector('.flex-col.md\\:flex-row');
      const imageHtml = renderProfileImage(url);
      profileSection.insertAdjacentHTML('beforeend', imageHtml);
    }
    
    updateProfilePicStatus('Uploaded successfully!', 'text-green-400');
    markUnsavedChanges();
    
    // Auto-save if enabled
    if (autoSaveEnabled) {
      setTimeout(() => {
        document.getElementById('profileForm').dispatchEvent(new Event('submit'));
      }, 1000);
    }
    
  } catch (error) {
    console.error('Upload failed:', error);
    updateProfilePicStatus('Upload failed', 'text-red-400');
    await showAlert('error', 'Upload Failed', 'Failed to upload image. Please try again.');
  }
}

function updateProfilePicStatus(message, className) {
  const statusEl = document.getElementById('profilePicStatus');
  statusEl.textContent = message;
  statusEl.className = `text-sm truncate max-w-xs ${className}`;
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "preset");

  const response = await fetch("https://api.cloudinary.com/v1_1/dufg7fm4stt/image/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.secure_url) {
    throw new Error("No secure URL returned from Cloudinary");
  }

  return data.secure_url;
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
    markUnsavedChanges();
  });
}

function updateTaglineCounter() {
  const input = document.getElementById('taglineInput');
  const counter = document.getElementById('taglineCounter');
  const remaining = 120 - input.value.length;
  counter.textContent = remaining;
  counter.className = remaining < 20 ? 'text-yellow-400' : 'text-gray-400';
  markUnsavedChanges();
}

function addSocialLink() {
  const container = document.getElementById('socialLinksContainer');
  const currentCount = container.querySelectorAll('input').length;

  if (currentCount >= CONFIG.maxSocialLinks) {
    showAlert('info', 'Maximum Reached', 
      `You can add up to ${CONFIG.maxSocialLinks} social links.`,
      { icon: 'fas fa-info-circle', duration: 3000 }
    );
    return;
  }

  const div = document.createElement('div');
  div.className = 'social-link-item flex items-center gap-2';
  div.setAttribute('data-index', currentCount);
  div.innerHTML = `
    <button type="button" class="handle text-gray-400 hover:text-gray-300 cursor-move px-2 transition-colors" title="Drag to reorder">
      <i class="fas fa-grip-vertical"></i>
    </button>
    <input type="url" name="socialLinks" placeholder="https://example.com"
           class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
    <button type="button" class="remove-social-link text-red-400 hover:text-red-300 px-2 transition-colors">
      <i class="fas fa-times"></i>
    </button>
  `;

  div.querySelector('.remove-social-link').addEventListener('click', () => {
    div.remove();
    updateRemainingLinks();
    markUnsavedChanges();
  });

  container.appendChild(div);
  updateRemainingLinks();
  markUnsavedChanges();
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

function addUnsavedChangesListener() {
  const form = document.getElementById('profileForm');
  form.addEventListener('input', () => markUnsavedChanges());
}

function markUnsavedChanges() {
  unsavedChanges = true;
  showSaveStatus('You have unsaved changes', 'text-yellow-400');
}

function handleBeforeUnload(e) {
  if (unsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const saveSpinner = document.getElementById('saveSpinner');
  
  // Validate required fields
  const nameInput = document.getElementById('nameInput');
  if (!nameInput.value.trim()) {
    nameInput.classList.add('border-red-500');
    await showAlert('error', 'Validation Error', 'Name is required');
    nameInput.focus();
    return;
  }

  // Get profilePic URL directly - NO ESCAPING
  const profilePicUrl = document.getElementById('profilePicUrl').value.trim();
  
  console.log('🔍 DEBUG - Profile Pic URL from input:', profilePicUrl);

  // Collect social links in their current order
  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link && isValidUrl(link));

  // Collect form data
  const updateData = {
    name: nameInput.value.trim(),
    tagline: document.getElementById('taglineInput').value.trim(),
    phone: document.getElementById('phoneInput').value.trim(),
    address: document.getElementById('addressInput').value.trim(),
    profilePic: profilePicUrl, // Pass URL directly without modification
    socialLinks: socialLinks
  };

  console.log('📦 Final update data being sent:', JSON.stringify(updateData, null, 2));

  try {
    // UI Loading State
    submitBtn.disabled = true;
    saveSpinner.classList.remove('hidden');
    showSaveStatus('Saving changes...', 'text-blue-400');

    // Verify session
    const verifyUrl = `${CONFIG.googleEditUrl}?action=verify_session&token=${state.currentUser.sessionToken}`;
    const verifyResponse = await fetch(verifyUrl);
    const sessionData = await verifyResponse.json();

    if (!sessionData.valid) {
      throw new Error('SESSION_EXPIRED');
    }

    // Send update request - encode only once
    const dataString = JSON.stringify(updateData);
    const updateUrl = `${CONFIG.googleEditUrl}?action=update_profile&token=${state.currentUser.sessionToken}&email=${encodeURIComponent(state.currentUser.email)}&data=${encodeURIComponent(dataString)}`;
    
    console.log('🚀 Sending update to backend...');
    
    const updateResponse = await fetch(updateUrl);
    const result = await updateResponse.json();

    console.log('✅ Backend response:', result);

    if (result.status !== 'success') {
      throw new Error(result.message || 'Save failed');
    }

    // Success handling
    unsavedChanges = false;
    state.profileData = { ...state.profileData, ...updateData };
    showSaveStatus('Changes saved successfully!', 'text-green-400');
    
    // Update sidebar if name changed
    updateSidebar();

  } catch (error) {
    console.error('❌ Save error:', error);
    
    if (error.message.includes('SESSION_EXPIRED')) {
      await showAlert('error', 'Session Expired', 'Please log in again');
      logout();
      return;
    }
    
    await showAlert('error', 'Save Failed', error.message || 'Failed to save changes. Please try again.');
    showSaveStatus('Failed to save changes', 'text-red-400');
  } finally {
    submitBtn.disabled = false;
    saveSpinner.classList.add('hidden');
  }
}

function showSaveStatus(message, className = '') {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;

  // Clear existing timeout
  if (statusEl.timeoutId) {
    clearTimeout(statusEl.timeoutId);
  }

  statusEl.innerHTML = `
    <div class="flex items-center justify-center gap-2 transition-all duration-300">
      <span>${message}</span>
    </div>
  `;
  
  statusEl.className = `text-center text-sm p-2 rounded-lg transition-all duration-300 ${className}`;

  // Auto-hide success messages
  if (className.includes('green') || className.includes('blue')) {
    statusEl.timeoutId = setTimeout(() => {
      statusEl.innerHTML = '';
      statusEl.className = 'text-center text-sm min-h-[24px]';
    }, 5000);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
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