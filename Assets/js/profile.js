import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles } from './utils.js';
import { renderAnalyticsPage } from './analytics.js';
import { logout } from './auth.js';

export function setupPageNavigation() {
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');
  
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = this.getAttribute('data-page');
      
      // Update active state
      updateSidebarActiveState(this);
      
      // Load the appropriate page
      switchPage(page);
    });
  });
}

function updateSidebarActiveState(activeLink) {
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');
  
  sidebarLinks.forEach(link => {
    link.classList.remove('active', 'text-gray-200');
    link.classList.add('text-gray-400');
    link.querySelector('i').classList.remove('text-purple-400');
    link.querySelector('i').classList.add('text-gray-500');
  });
  
  activeLink.classList.add('active', 'text-gray-200');
  activeLink.classList.remove('text-gray-400');
  activeLink.querySelector('i').classList.add('text-purple-400');
  activeLink.querySelector('i').classList.remove('text-gray-500');
}

function switchPage(page) {
  const mainTitle = document.querySelector('.main-content h1');
  
  switch(page) {
    case 'profile':
      renderProfileForm();
      mainTitle.textContent = 'Profile Editor';
      break;
    case 'analytics':
      renderAnalyticsPage(); // This will now handle its own data loading
      mainTitle.textContent = 'Profile Analytics';
      break;
    case 'qrcode':
      // renderQrCodePage(); // Uncomment when you implement this
      mainTitle.textContent = 'QR Code Generator';
      break;
    case 'settings':
      // renderSettingsPage(); // Uncomment when you implement this
      mainTitle.textContent = 'Account Settings';
      break;
    default:
      renderProfileForm();
      mainTitle.textContent = 'Profile Editor';
  }
}
let beforeUnloadListener = null;

export async function loadProfileData() {
  if (state.profileData) {
    // Clean up existing listeners first
    if (beforeUnloadListener) {
      window.removeEventListener('beforeunload', beforeUnloadListener);
    }
    
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    updateSidebar();
    setupPageNavigation();
    renderProfileForm();
    addUnsavedChangesListener();
    
    beforeUnloadListener = handleBeforeUnload;
    window.addEventListener('beforeunload', beforeUnloadListener);
  }
}

let unsavedChanges = false;

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
    <div class="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-4 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/30">
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
          <div class="flex items-center gap-2">
            <button type="button" id="addSocialLink" 
                    class="text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    aria-label="Add social link">
              <i class="fas fa-plus"></i> Add
            </button>
            <span class="text-gray-400 text-sm">• Drag to reorder</span>
          </div>
        </div>
        <div id="socialLinksContainer" class="space-y-3">
          ${(profileData.socialLinks || []).map((link, index) => `
            <div class="social-link-item flex items-center gap-2 bg-gray-700/50 p-2 rounded-lg border border-gray-600/30 transition-all hover:border-purple-500/30"
                 data-index="${index}">
              <div class="drag-handle text-gray-400 hover:text-purple-400 cursor-grab active:cursor-grabbing px-2">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <input type="url" name="socialLinks" value="${escapeHtml(link)}" 
                     class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                     pattern="https?://.+">
              <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2 transition-colors"
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
  setupDragAndDrop();
}


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
  
  // Update remove button event listeners to work with new structure
  document.addEventListener('click', e => {
    if (e.target.closest('.remove-link-btn')) {
      e.target.closest('.social-link-item').remove();
      unsavedChanges = true;
      updateRemainingLinks();
      setupDragAndDrop(); // Reinitialize after removal
    }
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

  const formatPhone = (e) => {
    let numbers = e.target.value.replace(/\D/g, '');
    if (!numbers) {
      e.target.value = '';
      return;
    }

    const formatted = numbers.match(/.{1,3}/g)?.join(' ') || numbers;
    e.target.value = '+' + formatted;
    unsavedChanges = true;
  };

  // Remove previous listener if exists
  phoneInput.removeEventListener('input', formatPhone);
  phoneInput.addEventListener('input', formatPhone);
}
function setupDragAndDrop() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;

  // Make all social link items draggable
  const items = container.querySelectorAll('.social-link-item');
  items.forEach(item => {
    item.setAttribute('draggable', 'true');
    
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', e.target.dataset.index);
      e.target.classList.add('dragging', 'opacity-50', 'border-purple-500');
    });
    
    item.addEventListener('dragend', (e) => {
      e.target.classList.remove('dragging', 'opacity-50', 'border-purple-500');
      updateSocialLinksOrder();
    });
  });

  // Setup drop zones
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (draggable) {
      if (afterElement) {
        container.insertBefore(draggable, afterElement);
      } else {
        container.appendChild(draggable);
      }
    }
  });

  container.addEventListener('dragenter', (e) => {
    e.preventDefault();
    if (e.target.classList.contains('social-link-item') && !e.target.classList.contains('dragging')) {
      e.target.classList.add('border-purple-400');
    }
  });

  container.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('social-link-item')) {
      e.target.classList.remove('border-purple-400');
    }
  });
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

function updateSocialLinksOrder() {
  const container = document.getElementById('socialLinksContainer');
  const items = container.querySelectorAll('.social-link-item');
  
  // Update data-index attributes to reflect new order
  items.forEach((item, index) => {
    item.dataset.index = index;
  });
  
  unsavedChanges = true;
  showSaveStatus('Links reordered - remember to save!', 'text-yellow-400');
}


function addSocialLink() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;

  const currentCount = container.querySelectorAll('.social-link-item').length;

  if (currentCount >= CONFIG.maxSocialLinks) {
    showAlert('info', 'Maximum Reached', 
      `You can add up to ${CONFIG.maxSocialLinks} links. Consider upgrading your plan.`,
      { icon: 'fas fa-info-circle', duration: 3000 }
    );
    return;
  }

  const div = document.createElement('div');
  div.className = 'social-link-item flex items-center gap-2 bg-gray-700/50 p-2 rounded-lg border border-gray-600/30 transition-all hover:border-purple-500/30';
  div.dataset.index = currentCount;
  div.innerHTML = `
    <div class="drag-handle text-gray-400 hover:text-purple-400 cursor-grab active:cursor-grabbing px-2">
      <i class="fas fa-grip-vertical"></i>
    </div>
    <input type="url" name="socialLinks" placeholder="https://example.com"
           class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
           pattern="https?://.+" required>
    <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2 transition-colors"
            aria-label="Remove social link">
      <i class="fas fa-times"></i>
    </button>
  `;

  const removeBtn = div.querySelector('.remove-link-btn');
  removeBtn.addEventListener('click', () => {
    div.remove();
    unsavedChanges = true;
    updateRemainingLinks();
    setupDragAndDrop(); // Reinitialize drag and drop after removal
  });

  // Add input validation
  const input = div.querySelector('input');
  input.addEventListener('blur', () => {
    if (input.value && !isValidUrl(input.value)) {
      input.classList.add('border-red-500');
      showAlert('error', 'Invalid URL', 'Please enter a valid URL starting with http:// or https://');
    } else {
      input.classList.remove('border-red-500');
    }
  });

  container.appendChild(div);
  updateRemainingLinks();
  setupDragAndDrop(); // Reinitialize drag and drop after adding
  unsavedChanges = true;
}

function updateRemainingLinks() {
  const container = document.getElementById('socialLinksContainer');
  const count = container.querySelectorAll('.social-link-item').length;
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

  // Get social links in current order (respecting drag-and-drop order)
  const socialLinks = [];
  const socialLinkItems = document.querySelectorAll('.social-link-item');
  socialLinkItems.forEach(item => {
    const input = item.querySelector('input[name="socialLinks"]');
    if (input && input.value.trim()) {
      socialLinks.push(escapeHtml(input.value.trim()));
    }
  });

  // Prepare update data
  const updateData = {
    name: escapeHtml(formData.get('name').trim()),
    tagline: escapeHtml(formData.get('tagline')?.trim()),
    phone: escapeHtml(formData.get('phone')?.trim()),
    address: escapeHtml(formData.get('address')?.trim()),
    profilePic: escapeHtml(formData.get('profilePic')?.trim()), // This comes from the hidden input
    socialLinks: socialLinks // Use the reordered links
  };

  try {
    // UI Loading State
    const saveBtn = form.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    // Toggle spinner
    showSaveStatus('Saving changes...', 'text-blue-400');
    // turn off alert


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
  
  // Clear any existing timeouts and animations
  if (statusEl._timeoutId) {
    clearTimeout(statusEl._timeoutId);
    statusEl._timeoutId = null;
  }
  
  if (statusEl._animationId) {
    cancelAnimationFrame(statusEl._animationId);
  }

  // Determine status type and corresponding styles
  const statusConfig = {
    'green': {
      icon: 'fa-check-circle',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      iconColor: 'text-green-400'
    },
    'red': {
      icon: 'fa-times-circle',
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      iconColor: 'text-red-400'
    },
    'blue': {
      icon: 'fa-spinner fa-spin',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      iconColor: 'text-blue-400'
    },
    'yellow': {
      icon: 'fa-exclamation-circle',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      iconColor: 'text-yellow-400'
    },
    'default': {
      icon: 'fa-info-circle',
      bgColor: 'bg-gray-900/20',
      borderColor: 'border-gray-500/30',
      textColor: 'text-gray-400',
      iconColor: 'text-gray-400'
    }
  };

  // Find matching status type
  let statusType = 'default';
  for (const type of ['green', 'red', 'blue', 'yellow']) {
    if (className.includes(type)) {
      statusType = type;
      break;
    }
  }

  const config = statusConfig[statusType];
  const icon = `<i class="fas ${config.icon} ${config.iconColor}"></i>`;

  // Create new status element with improved structure
  const newStatus = document.createElement('div');
  newStatus.className = `save-status-item flex items-center justify-center gap-3 p-3 rounded-lg border backdrop-blur-sm transition-all duration-500 transform ${config.bgColor} ${config.borderColor} ${config.textColor}`;
  newStatus.style.transform = 'translateY(-10px) scale(0.95)';
  newStatus.style.opacity = '0';
  newStatus.innerHTML = `
    <span class="text-lg flex-shrink-0">${icon}</span>
    <span class="font-medium flex-1 text-center">${message}</span>
    <button class="close-status flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity ml-2" aria-label="Dismiss">
      <i class="fas fa-times text-sm"></i>
    </button>
  `;

  // Add progress bar for auto-dismiss messages
  if (statusType === 'green' || statusType === 'blue') {
    const progressBar = document.createElement('div');
    progressBar.className = 'absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-lg transition-all duration-100';
    progressBar.style.width = '100%';
    progressBar.style.transform = 'scaleX(1)';
    progressBar.style.transformOrigin = 'left center';
    newStatus.appendChild(progressBar);
  }

  // Clear existing content and add new status
  statusEl.innerHTML = '';
  statusEl.appendChild(newStatus);

  // Add base container styles
  statusEl.className = `save-status-container fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300`;

  // Animate in
  statusEl._animationId = requestAnimationFrame(() => {
    newStatus.style.transform = 'translateY(0) scale(1)';
    newStatus.style.opacity = '1';
    
    // Animate progress bar if exists
    const progressBar = newStatus.querySelector('.absolute');
    if (progressBar) {
      progressBar.style.transition = 'transform 3s linear';
      progressBar.style.transform = 'scaleX(0)';
    }
  });

  // Setup close button
  const closeBtn = newStatus.querySelector('.close-status');
  closeBtn.addEventListener('click', () => {
    dismissStatus(statusEl, newStatus);
  });

  // Auto-dismiss for success and info messages
  const autoDismiss = statusType === 'green' || statusType === 'blue';
  if (autoDismiss) {
    statusEl._timeoutId = setTimeout(() => {
      dismissStatus(statusEl, newStatus);
    }, 5000);
  }

  // Also dismiss on click anywhere on the status (except close button)
  newStatus.addEventListener('click', (e) => {
    if (!e.target.closest('.close-status')) {
      dismissStatus(statusEl, newStatus);
    }
  });

  // Store reference for external control
  statusEl._currentStatus = newStatus;
}

function dismissStatus(container, statusElement) {
  if (!statusElement || statusElement._isDismissing) return;
  
  statusElement._isDismissing = true;
  
  // Clear any existing timeout
  if (container._timeoutId) {
    clearTimeout(container._timeoutId);
    container._timeoutId = null;
  }

  // Animate out
  statusElement.style.transform = 'translateY(-10px) scale(0.95)';
  statusElement.style.opacity = '0';
  
  setTimeout(() => {
    if (statusElement.parentNode === container) {
      container.innerHTML = '';
      container.className = 'save-status-container hidden';
    }
    statusElement._isDismissing = false;
  }, 300);
}

// Utility function to manually clear status
function clearSaveStatus() {
  const statusEl = document.getElementById('saveStatus');
  if (statusEl && statusEl._currentStatus) {
    dismissStatus(statusEl, statusEl._currentStatus);
  }
}

// Enhanced version with queue system for multiple messages
const statusQueue = [];
let isShowingStatus = false;

function showSaveStatusQueued(message, className = '') {
  // Add to queue
  statusQueue.push({ message, className });
  
  // If not currently showing a status, show the next one
  if (!isShowingStatus) {
    showNextStatus();
  }
}

function showNextStatus() {
  if (statusQueue.length === 0) {
    isShowingStatus = false;
    return;
  }
  
  isShowingStatus = true;
  const { message, className } = statusQueue.shift();
  
  showSaveStatus(message, className);
  
  // Set up to show next status after a delay
  const statusEl = document.getElementById('saveStatus');
  if (statusEl) {
    statusEl._queueTimeout = setTimeout(() => {
      showNextStatus();
    }, 2000); // 2 second gap between messages
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