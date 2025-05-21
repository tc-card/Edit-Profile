import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './utils.js';

export async function loadProfileData() {
  try {
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=get_profile&email=${encodeURIComponent(state.currentUser.email)}&token=${state.currentUser.sessionToken}`);
    const data = await response.json();

    if (data.status === 'success') {
      state.profileData = data.profile;
      renderProfileForm();
    } else {
      throw new Error(data.message || 'Failed to load profile');
    }
  } catch (error) {
    await showAlert('error', 'Load Failed', error.message);
    if (error.message.includes('session') || error.message.includes('token')) {
      logout();
    }
  }
}

function renderProfileForm() {
  const { profileData } = state;

  DOM.profileEditor.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-purple-400">Edit Profile</h1>
      <button id="logoutBtn" class="text-red-400 hover:text-red-300 flex items-center gap-1">
        <i class="fas fa-sign-out-alt"></i> Logout
      </button>
    </div>

    <div class="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
      <!-- Profile header with image -->
      <div class="flex flex-col md:flex-row md:items-center gap-6">
        ${profileData.profilePic ? `
          <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0">
            <img src="${profileData.profilePic}" alt="Profile" class="w-full h-full object-cover" id="profileImagePreview">
          </div>
        ` : ''}
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-purple-400">${profileData.name || 'No Name'}</h1>
          <p class="text-gray-300">${profileData.tagline || ''}</p>
          ${profileData.link ? `
            <p class="mt-2">
              <a href="https://card.tccards.tn/profile/@${profileData.link}" target="_blank" class="text-blue-400 hover:underline">
                View Public Profile
              </a>
            </p>
          ` : ''}
        </div>
      </div>
    </div>

    <form id="profileForm" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Personal Info Section -->
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Personal Information</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1">Name *</label>
            <input type="text" name="name" value="${profileData.name || ''}" required
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Tagline</label>
            <input type="text" name="tagline" value="${profileData.tagline || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Phone</label>
            <input type="tel" name="phone" value="${profileData.phone || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Address</label>
            <textarea name="address" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">${profileData.address || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm text-gray-300 mb-1">Profile Picture URL</label>
            <input type="url" name="profilePic" value="${profileData.profilePic || ''}"
                   class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500"
                   id="profilePicInput">
            <p class="text-xs text-gray-400 mt-1">Must be a direct image URL</p>
          </div>
        </div>
      </div>

      <!-- Social Links Section -->
      <div class="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-purple-400">Social Links</h2>
          <button type="button" id="addSocialLink" class="text-purple-400 hover:text-purple-300">
            <i class="fas fa-plus mr-1"></i> Add
          </button>
        </div>
        <div id="socialLinksContainer" class="space-y-3">
          ${(profileData.socialLinks || []).map(link => `
            <div class="flex items-center gap-2">
              <input type="url" name="socialLinks" value="${link}" 
                     class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
              <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="md:col-span-2">
        <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg">
          Save Changes
        </button>
      </div>
    </form>
  `;

  // Event Listeners
  setupProfileFormEvents();
}

function setupProfileFormEvents() {
  document.getElementById('profileForm').addEventListener('submit', handleSaveProfile);
  document.getElementById('addSocialLink').addEventListener('click', addSocialLink);
  document.querySelectorAll('.remove-link-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.target.closest('div').remove();
    });
  });

  // Profile picture preview
  const profilePicInput = document.getElementById('profilePicInput');
  if (profilePicInput) {
    profilePicInput.addEventListener('input', (e) => {
      const preview = document.getElementById('profileImagePreview');
      if (preview) {
        preview.src = e.target.value;
      }
    });
  }

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);
}

function addSocialLink() {
  const container = document.getElementById('socialLinksContainer');
  const currentCount = container.querySelectorAll('input').length;

  if (currentCount >= CONFIG.maxSocialLinks) {
    showAlert('info', 'Maximum reached', `You can only add ${CONFIG.maxSocialLinks} links.`);
    return;
  }

  const div = document.createElement('div');
  div.className = 'flex items-center gap-2';
  div.innerHTML = `
    <input type="url" name="socialLinks" placeholder="https://example.com"
           class="flex-1 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500">
    <button type="button" class="remove-link-btn text-red-400 hover:text-red-300 px-2">
      <i class="fas fa-times"></i>
    </button>
  `;
  div.querySelector('.remove-link-btn').addEventListener('click', () => div.remove());
  container.appendChild(div);
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  // Basic validation
  if (!formData.get('name')?.trim()) {
    await showAlert('error', 'Validation Error', 'Name is required');
    return;
  }

  const updateData = {
    name: formData.get('name').trim(),
    tagline: formData.get('tagline')?.trim(),
    phone: formData.get('phone')?.trim(),
    address: formData.get('address')?.trim(),
    profilePic: formData.get('profilePic')?.trim(),
    socialLinks: Array.from(formData.getAll('socialLinks'))
      .map(link => link.trim())
      .filter(link => link && isValidUrl(link))
  };

  try {
    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const response = await fetch(`${CONFIG.googleScriptUrl}?action=update_profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: state.currentUser.sessionToken,
        email: state.currentUser.email,
        data: JSON.stringify(updateData)
      })
    });

    const data = await response.json();

    if (data.status === 'success') {
      await showAlert('success', 'Saved', 'Profile updated successfully');
      await loadProfileData(); // Refresh data
    } else {
      throw new Error(data.message || 'Save failed');
    }
  } catch (error) {
    await showAlert('error', 'Error', error.message);
    if (error.message.includes('session') || error.message.includes('token')) {
      logout();
    }
  } finally {
    const saveBtn = e.target.querySelector('button[type="submit"]');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}