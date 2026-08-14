import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles } from './utils.js';
import { logout } from './auth.js';

let unsavedChanges = false;
let autoSaveEnabled = false;
let debouncedAutoSave;
let isSaving = false;
let lastSavedAt = null;
let statusRefreshInterval = null;
let qrCodeInstance = null;
let uploadedLogoUrl = null;

const AUTO_SAVE_STORAGE_KEY = 'profileEditorAutoSaveEnabled';

export async function loadProfileData() {
  if (!state.profileData) return;

  // Show dashboard and hide login screen
  DOM.loginScreen.classList.add('hidden');
  DOM.dashboard.classList.remove('hidden');
  
  // Update sidebar with user info
  updateSidebar();
  updatePublicProfileLink();
  
  // Render profile form
  renderProfileForm();
  
  // FIXED: Updated to the correct function name
  setupFormEvents(); 
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
  const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');
  if (logoutBtnSidebar) {
    logoutBtnSidebar.onclick = logout;
  }
}

// REVERTED: Original simple updatePublicProfileLink
export function updatePublicProfileLink() {
  if (!DOM.publicProfileLink) return;

  const profileLink = state.profileData?.link?.trim();
  if (profileLink) {
    const normalizedLink = profileLink.startsWith('@') ? profileLink.slice(1) : profileLink;
    DOM.publicProfileLink.href = `https://card.tccards.tn/@${normalizedLink}`;
    DOM.publicProfileLink.classList.remove('opacity-50', 'pointer-events-none');
    DOM.publicProfileLink.setAttribute('aria-disabled', 'false');
    return;
  }

  DOM.publicProfileLink.href = '#';
  DOM.publicProfileLink.classList.add('opacity-50', 'pointer-events-none');
  DOM.publicProfileLink.setAttribute('aria-disabled', 'true');
}

export function renderProfileForm() {
  const { profileData } = state;
  const lastEdit = profileData.timestamp ? new Date(profileData.timestamp) : null;
  const lastEditMessage = lastEdit ? 
    `Last edited: ${lastEdit.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : 
    'No edits yet';

  DOM.profileEditor.innerHTML = `
    <!-- Mobile-first reset & SortableJS styles -->
    <style>
      #profileEditor {
        background: transparent !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      @media (min-width: 768px) {
        #profileEditor {
          background: rgba(31, 41, 55, 0.8) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 12px !important;
          padding: 24px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
          border: 1px solid rgba(75, 85, 99, 0.5) !important;
        }
      }
      
      /* SortableJS Ghost Styling - keeps layout clean while dragging */
      .sortable-ghost {
        opacity: 0.4;
        background-color: rgba(139, 92, 246, 0.1) !important;
        border: 2px dashed #7c3aed !important;
        border-radius: 12px !important;
      }
      .sortable-chosen {
        background-color: rgba(55, 65, 81, 0.9) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
      }
    </style>

    <form id="profileForm" class="space-y-4 md:space-y-6">
      
      <!-- Auto-save toggle inside grid -->
      <div class="p-3 md:p-4 bg-gray-700/30 md:bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <q class="text-xs text-gray-400 italic block">${lastEditMessage}</q>
          <h1 class="text-xl md:text-2xl font-bold text-purple-400">${escapeHtml(profileData.name) || 'No Name'}</h1>
        </div>
        <button type="button" id="autoSaveToggle" class="text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all flex items-center gap-2 bg-gray-700 hover:bg-gray-600">
          <i class="fas fa-clock"></i>
          <span>Auto-save: Off</span>
        </button>
      </div>

    <!-- 4-Card Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- TOP LEFT: Personal Info -->
      <div class="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700/50">
        ${renderPersonalInfoSection(profileData)}
      </div>

      <!-- TOP RIGHT: Social Links -->
      <div class="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700/50">
        ${renderSocialLinksSection(profileData)}
      </div>

    </div>

    <!-- Save Controls under the grid -->
    <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-gray-800/70 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
      <div id="saveStatus" aria-live="polite" class="inline-flex items-center gap-2 text-sm text-gray-300"></div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button type="submit" form="profileForm" class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <span id="saveBtnText">Save Changes</span>
          <span id="saveSpinner" class="hidden"><i class="fas fa-spinner fa-spin"></i></span>
        </button>
        <a href="https://termination.tccards.tn/" target="_blank" class="inline-flex items-center justify-center text-sm text-red-400 hover:text-red-300 transition-colors">
          <i class="fas fa-trash-alt mr-2"></i> Delete account
        </a>
      </div>
    </div>
  `;

      // <!-- BOTTOM LEFT: Style & Background Controls -->
      // <div class="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700/50">
      //   ${renderStyleControlsSection(profileData)}
      // </div>

      // <!-- BOTTOM RIGHT: Live Preview (Non-Interactive) -->
      // <div class="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700/50 flex flex-col">
      //   <h2 class="text-xl font-semibold text-purple-400 mb-4">Live Preview</h2>
      //   <!-- UPDATED: Increased max and min height for a better mobile-scale card feel -->
      //   <div id="livePreviewContainer" class="w-full aspect-[4/5] min-h-[500px] max-h-[650px] rounded-xl overflow-hidden shadow-lg bg-black pointer-events-none border border-gray-600/50">
      //     <!-- Preview injected here -->
      //   </div>
      //   <p class="text-xs text-center text-gray-500 mt-2 italic">Matches the public view exactly</p>
      // </div>
  // CRITICAL FIX: Wrap initializeForm in try/catch to prevent crashing the preview
  try {
    initializeForm();
  } catch (error) {
    console.error("Form initialization error (preview will still work):", error);
  }
}

// --- SECTION RENDERERS ---

function renderPersonalInfoSection(profileData) {
  const taglineLength = profileData.tagline?.length || 0;

  return `
    <h2 class="text-lg md:text-xl font-semibold text-purple-400 mb-3 md:mb-4">Personal Information</h2>
    <div class="space-y-3 md:space-y-4">
      <div>
        <label for="nameInput" class="block text-xs md:text-sm text-gray-300 mb-1">Name *</label>
        <input id="nameInput" type="text" name="name" value="${escapeHtml(profileData.name) || ''}" required
               class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      
      <div>
        <label for="taglineInput" class="block text-xs md:text-sm text-gray-300 mb-1">Tagline</label>
        <input id="taglineInput" type="text" name="tagline" value="${escapeHtml(profileData.tagline) || ''}" 
               maxlength="120" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
        <p class="text-xs text-gray-400 mt-1 text-right">
          <span id="taglineCounter">${120 - taglineLength}</span>/120 characters left
        </p>
      </div>
      
      <div>
        <label for="phoneInput" class="block text-xs md:text-sm text-gray-300 mb-1">Phone</label>
        <input id="phoneInput" type="tel" name="phone" value="${escapeHtml(profileData.phone) || ''}"
               class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
        <p class="text-xs text-gray-400 mt-1">Format: +123 456 7890</p>
      </div>
      
      <div>
        <label for="addressInput" class="block text-xs md:text-sm text-gray-300 mb-1">Address</label>
        <textarea id="addressInput" name="address" rows="2" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors resize-none">${escapeHtml(profileData.address) || ''}</textarea>
      </div>
      
      <div>
        <label class="block text-xs md:text-sm text-gray-300 mb-1">Profile Picture</label>
        <div class="flex flex-wrap items-center gap-2">
          <input type="file" id="profilePicInput" accept="image/*" class="hidden">
          <button type="button" id="uploadImageBtn" 
                  class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700 rounded border border-gray-600 hover:border-purple-500 text-sm transition-colors">
            <i class="fas fa-upload mr-2"></i> Upload
          </button>
          <input type="hidden" id="profilePicUrl" value="${profileData.profilePic || ''}">
          <span id="profilePicStatus" class="text-xs text-gray-400 truncate max-w-[150px]">
            ${profileData.profilePic ? 'Image set' : 'No image selected'}
          </span>
        </div>
        <p class="text-[10px] text-gray-400 mt-1">Max 2MB (JPG, PNG, GIF, WEBP)</p>
      </div>
    </div>
  `;
}

function renderStyleControlsSection(profileData) {
  const styleConfig = parseStyleValue(profileData.style);
  const gradientEnabled = styleConfig.type !== 'image';
  const color1 = styleConfig.color1 || '#7c3aed';
  const color2 = styleConfig.color2 || '#1d4ed8';
  const color3 = styleConfig.color3 || '#0f172a';
  const direction = styleConfig.direction || '135deg';
  const imageUrl = styleConfig.imageUrl || '';

  return `
    <h2 class="text-xl font-semibold text-purple-400 mb-4">Profile Style</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div>
        <label for="backgroundType" class="block text-sm text-gray-300 mb-1">Background Type</label>
        <select id="backgroundType" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          <option value="gradient" ${gradientEnabled ? 'selected' : ''}>Gradient</option>
          <option value="image" ${!gradientEnabled ? 'selected' : ''}>Image URL</option>
        </select>
      </div>
      <!-- UPDATED: Wrapped in group to hide with JavaScript when Image URL is selected -->
      <div id="gradientDirectionGroup">
        <label for="gradientDirection" class="block text-sm text-gray-300 mb-1">Gradient Direction</label>
        <select id="gradientDirection" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          ${renderGradientDirectionOptions(direction)}
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4" id="gradientInputsGroup">
      <div>
        <label for="gradientColor1" class="block text-sm text-gray-300 mb-1">Color 1</label>
        <input id="gradientColor1" type="color" value="${color1}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor2" class="block text-sm text-gray-300 mb-1">Color 2</label>
        <input id="gradientColor2" type="color" value="${color2}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor3" class="block text-sm text-gray-300 mb-1">Color 3</label>
        <input id="gradientColor3" type="color" value="${color3}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
    </div>

    <div id="imageInputsGroup" class="mb-4">
      <label for="backgroundImageUrl" class="block text-sm text-gray-300 mb-1">Background Image URL</label>
      <input id="backgroundImageUrl" type="url" value="${escapeHtml(imageUrl)}" placeholder="https://example.com/background.jpg"
             class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      <p class="text-xs text-gray-400 mt-1">Use a direct image URL only.</p>
    </div>

    <!-- REMOVED: The small "Live background preview" box -->
  `;
}

function renderSocialLinksSection(profileData) {
  const socialLinks = profileData.socialLinks || [];
  const remainingLinks = CONFIG.maxSocialLinks - socialLinks.length;

  return `
    <div class="space-y-3 md:space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg md:text-xl font-semibold text-purple-400">Social Links</h2>
        <button type="button" id="addSocialLink" class="text-xs md:text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
          <i class="fas fa-plus"></i> Add
        </button>
      </div>
      
      <!-- SortableJS uses this container ID -->
      <div id="socialLinksContainer" class="space-y-2 md:space-y-3 w-full">
        ${socialLinks.map((link, index) => `
          <div class="social-link-item flex flex-row w-full items-center justify-between gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-700/50 md:bg-gray-700 rounded-lg md:rounded-xl border border-gray-600/30 md:border-transparent" data-index="${index}">
            <button type="button" class="handle text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 transition-colors w-6 md:w-8 text-center" title="Drag to reorder">
              <i class="fas fa-grip-vertical"></i>
            </button>
            <input type="url" name="socialLinks" value="${escapeHtml(link)}" 
                   class="flex-1 min-w-0 bg-transparent border-0 border-b-2 border-transparent focus:border-purple-500 px-1 py-1 text-sm md:text-base text-white placeholder-gray-500 transition-colors outline-none truncate"
                   placeholder="https://example.com">
            <button type="button" class="remove-social-link text-red-400 hover:text-red-300 p-1 transition-colors w-6 md:w-8 text-center">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('')}
      </div>
      <p class="text-xs ${remainingLinks < 3 ? 'text-yellow-400' : 'text-gray-400'} mt-1">
        ${remainingLinks} links remaining
      </p>
    </div>
  `;
}

function renderProfileImage(profilePic) {
  if (!profilePic) return '';
  return `
    <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 flex-shrink-0 bg-gray-700">
      <img src="${profilePic}" alt="Profile" class="w-full h-full object-cover" id="profileImagePreview" onerror="this.src='https://tccards.tn/Assets/150.png'">
    </div>
  `;
}

// --- PREVIEW LOGIC (EXACT MATCH TO MAIN.JS) ---

function renderSocialLinksPreview(links) {
  if (!links || links.length === 0) return '';
  return `<div class="social-links" style="display:flex; flex-direction:column; gap:10px; width:100%;">
    ${links.map(link => {
      let href = link.trim();
      if (!href) return '';
      if (!/^https?:\/\//i.test(href)) href = 'https://' + href;
      try {
        const url = new URL(href);
        const domain = url.hostname.replace(/^www\./, '');
        return `
          <a href="#" style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.1); padding:12px 16px; border-radius:8px; color:white; text-decoration:none; font-size:16px; pointer-events:none; cursor:default;">
            <img src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico" alt="" style="width:24px; height:24px; object-fit:contain; flex-shrink:0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />
            <i class="fas fa-link" style="display:none;"></i>
            <span>${escapeHtml(domain)}</span>
          </a>
        `;
      } catch (_) {
        return '';
      }
    }).join('')}
  </div>`;
}

// function buildPublicPreviewHtml(data) {
//   const { name, tagline, profilePic, socialLinks, background, email, phone, address } = data;
//   const currentYear = new Date().getFullYear();

//   // FIXED: Clean check. bg-black is removed. Combined CSS props directly into this string.
//   const bgStyle = background && background.trim() !== '' 
//     ? `background: ${background}; background-size: cover; background-position: center; background-repeat: no-repeat;` 
//     : `background: linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23)); background-size: cover; background-position: center;`;

//   return `
//     <div class="w-full h-full overflow-hidden" style="${bgStyle}">
//       <div class="w-full h-full flex items-center justify-center p-4">
//         <div class="w-full max-w-md p-6 rounded-xl shadow-lg mx-auto" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);">
          
//           <!-- Share Button (Static for preview) -->
//           <div class="w-full flex justify-end mb-2">
//             <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center" style="background: rgba(0,0,0,0.2);">
//               <i class="fas fa-share-alt text-gray-400 text-sm"></i>
//             </div>
//           </div>

//           <!-- Profile Image -->
//           <div class="w-full flex justify-center mb-4">
//             <img src="${profilePic || 'https://tccards.tn/Assets/default.png'}" 
//                  class="w-32 h-32 bg-gray-800 rounded-full object-cover" 
//                  alt="Profile" 
//                  onerror="this.src='https://tccards.tn/Assets/default.png'">
//           </div>

//           <!-- Name Plate -->
//           <div class="w-full h-12 bg-gray-800 rounded mb-2 flex items-center justify-center shadow-lg">
//             <h1 class="text-2xl font-bold text-white">${escapeHtml(name) || 'Your Name'}</h1>
//           </div>

//           <!-- Tagline -->
//           ${tagline ? `<p class="tagline-text flex items-center justify-center">${escapeHtml(tagline)}</p>` : ''}

//           <!-- Social Links -->
//           <div class="w-full bg-transparent mb-4">
//             ${renderSocialLinksPreview(socialLinks)}
//           </div>

//           <!-- Contact Button -->
//           ${(email || phone || address) ? `
//             <div class="w-48 h-12 bg-gray-800 rounded mb-4 flex items-center justify-center shadow-lg mx-auto">
//               <button class="contact-btn" style="pointer-events: none; background: #2563eb; width: 100%; height: 100%; border: none; color: white; border-radius: 8px; cursor: default;">Get in Touch</button>
//             </div>
//           ` : ''}

//           <!-- Footer -->
//           <div class="mt-auto pt-4 border-t border-gray-800 w-full">
//             <footer class="space-y-2 text-center">
//               <div class="w-full py-2 rounded-lg bg-white/5 backdrop-blur-md">
//                 <span class="text-gray-400 text-xs transition-colors">
//                   Powered by &copy; Total Connect ${currentYear}
//                 </span>
//               </div>
//               <div class="w-1/2 mx-auto py-2 rounded-lg bg-gray-900 shadow-lg">
//                 <span class="text-emerald-400 text-xs font-medium transition-colors">
//                   Get your Card
//                 </span>
//               </div>
//             </footer>
//           </div>
//         </div>
//       </div>
//     </div>
//   `;
// }

function updateLivePreview() {
  const container = document.getElementById('livePreviewContainer');
  if (!container) return;

  const name = document.getElementById('nameInput')?.value || '';
  const tagline = document.getElementById('taglineInput')?.value || '';
  const profilePic = document.getElementById('profilePicUrl')?.value || '';
  const email = ''; // Not in form currently, but kept for exact structural matching
  const phone = document.getElementById('phoneInput')?.value || '';
  const address = document.getElementById('addressInput')?.value || '';
  const background = getBackgroundValueFromForm();
  
  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link);

  container.innerHTML = buildPublicPreviewHtml({ 
    name, tagline, profilePic, socialLinks, background, email, phone, address 
  });
}

// --- INITIALIZATION & EVENTS ---

export function initializeForm() {
  setupFormEvents();
  setupNavigationProtection();
  initPhoneFormatting();
  setupAutoSaveToggle();
  addUnsavedChangesListener();
  initSortableLinks(); // Replaced entirely with SortableJS
  restoreAutoSavePreference();
  startStatusRefreshLoop();
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupFormEvents() {
  const form = document.getElementById('profileForm');
  form?.addEventListener('submit', handleSaveProfile);
  
  document.getElementById('uploadImageBtn')?.addEventListener('click', () => {
    document.getElementById('profilePicInput')?.click();
  });
  document.getElementById('profilePicInput')?.addEventListener('change', handleProfilePicUpload);
  document.getElementById('addSocialLink')?.addEventListener('click', addSocialLink);
  document.getElementById('taglineInput')?.addEventListener('input', updateTaglineCounter);
}

// --- SweetAlert for Unsaved Changes ---
export async function promptUnsavedChanges() {
  if (!unsavedChanges) return true; 
  const result = await Swal.fire({
    title: 'Unsaved Changes',
    text: 'You have unsaved changes. Are you sure you want to leave this page?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#7c3aed',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Leave',
    cancelButtonText: 'Stay',
    background: '#1e293b',
    color: '#f8fafc',
    backdrop: 'rgba(0, 0, 0, 0.8)'
  });
  return result.isConfirmed;
}

function setupNavigationProtection() {
  DOM.publicProfileLink?.addEventListener('click', async (e) => {
    if (unsavedChanges) {
      e.preventDefault();
      const confirmed = await promptUnsavedChanges();
      if (confirmed) window.location.href = DOM.publicProfileLink.href;
    }
  });

  const deleteLink = document.querySelector('a[href="https://termination.tccards.tn/"]');
  if (deleteLink) {
    deleteLink.addEventListener('click', async (e) => {
      if (unsavedChanges) {
        e.preventDefault();
        const confirmed = await promptUnsavedChanges();
        if (confirmed) window.location.href = deleteLink.href;
      }
    });
  }
}

function handleBeforeUnload(e) {
  if (unsavedChanges) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
  }
}

// --- NEW: SORTABLEJS DRAG & DROP (Replaces manual custom code) ---
function initSortableLinks() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;
  
  // Prevent duplicate instances if the user switches tabs and comes back
  if (container.sortableInstance) {
    container.sortableInstance.destroy();
  }

  // Initialize SortableJS
  const sortable = new Sortable(container, {
    handle: '.handle',             // Only the grip icon triggers the drag
    animation: 150,                // Smooth transition speed
    easing: "cubic-bezier(1, 0, 0, 1)",
    ghostClass: 'sortable-ghost',  // Uses the CSS class we added in <style>
    chosenClass: 'sortable-chosen', // Highlights the item being dragged
    
    // Fires when dragging finishes
    onEnd: () => {
      markUnsavedChanges();
    }
  });

  // Store instance on the DOM element so we can clean it up on re-renders
  container.sortableInstance = sortable;
}

// --- REST OF YOUR EXISTING CODE (UNCHANGED) ---

function setupBackgroundStyleEvents() {
  const typeInput = document.getElementById('backgroundType');
  const directionInput = document.getElementById('gradientDirection');
  const color1Input = document.getElementById('gradientColor1');
  const color2Input = document.getElementById('gradientColor2');
  const color3Input = document.getElementById('gradientColor3');
  const imageUrlInput = document.getElementById('backgroundImageUrl');

  const syncAll = () => {
    updateBackgroundInputsVisibility();
    markUnsavedChanges();
  };

  [typeInput, directionInput, color1Input, color2Input, color3Input, imageUrlInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', syncAll);
    input.addEventListener('change', syncAll);
  });

  updateBackgroundInputsVisibility();
}

function updateBackgroundInputsVisibility() {
  const typeInput = document.getElementById('backgroundType');
  const gradientGroup = document.getElementById('gradientInputsGroup');
  const imageGroup = document.getElementById('imageInputsGroup');
  const directionGroup = document.getElementById('gradientDirectionGroup');

  if (!typeInput || !gradientGroup || !imageGroup) return;

  const isGradient = typeInput.value !== 'image';
  gradientGroup.classList.toggle('hidden', !isGradient);
  imageGroup.classList.toggle('hidden', isGradient);
  
  if (directionGroup) {
    directionGroup.classList.toggle('hidden', typeInput.value === 'image');
  }
}

function getBackgroundValueFromForm() {
  const typeInput = document.getElementById('backgroundType');
  const directionInput = document.getElementById('gradientDirection');
  const color1Input = document.getElementById('gradientColor1');
  const color2Input = document.getElementById('gradientColor2');
  const color3Input = document.getElementById('gradientColor3');
  const imageUrlInput = document.getElementById('backgroundImageUrl');

  if (!typeInput) return '';

  if (typeInput.value === 'image') {
    const url = imageUrlInput?.value.trim();
    return url ? `url("${escapeCssUrl(url)}")` : 'linear-gradient(135deg, rgb(45, 55, 72), rgb(17, 24, 39))';
  }

  const direction = directionInput?.value || '135deg';
  const color1 = color1Input?.value || '#7c3aed';
  const color2 = color2Input?.value || '#1d4ed8';
  const color3 = color3Input?.value || '#0f172a';
  return `linear-gradient(${direction}, ${color1}, ${color2}, ${color3})`;
}

function buildBackgroundStyleValue() {
  const typeInput = document.getElementById('backgroundType');
  const directionInput = document.getElementById('gradientDirection');
  const color1Input = document.getElementById('gradientColor1');
  const color2Input = document.getElementById('gradientColor2');
  const color3Input = document.getElementById('gradientColor3');
  const imageUrlInput = document.getElementById('backgroundImageUrl');

  if (!typeInput) return '';

  if (typeInput.value === 'image') {
    const imageUrl = imageUrlInput?.value.trim();
    return imageUrl ? `url("${escapeCssUrl(imageUrl)}")` : '';
  }

  const direction = directionInput?.value || '135deg';
  const color1 = color1Input?.value || '#7c3aed';
  const color2 = color2Input?.value || '#1d4ed8';
  const color3 = color3Input?.value || '#0f172a';
  return `linear-gradient(${direction}, ${color1}, ${color2}, ${color3})`;
}

function parseStyleValue(styleValue) {
  if (!styleValue) return { type: 'gradient' };

  if (typeof styleValue === 'string' && styleValue.trim().startsWith('url(')) {
    const match = styleValue.match(/url\(["']?(.*?)["']?\)/i);
    return { type: 'image', imageUrl: match?.[1] || '' };
  }

  if (typeof styleValue === 'string' && styleValue.includes('linear-gradient')) {
    const gradientMatch = styleValue.match(/linear-gradient\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/i);
    if (gradientMatch) {
      return {
        type: 'gradient',
        direction: gradientMatch[1].trim(),
        color1: gradientMatch[2].trim(),
        color2: gradientMatch[3].trim(),
        color3: gradientMatch[4].trim()
      };
    }
  }

  if (styles[styleValue]?.background) {
    return parseStyleValue(styles[styleValue].background.replace(/^background:/i, '').trim());
  }

  return { type: 'gradient' };
}

function renderGradientDirectionOptions(selectedDirection) {
  const directions = ['45deg', '90deg', '135deg', '180deg', '225deg'];
  return directions.map((direction) => `<option value="${direction}" ${direction === selectedDirection ? 'selected' : ''}>${direction}</option>`).join('');
}

function escapeCssUrl(url) {
  return url.replace(/"/g, '%22').replace(/'/g, '%27');
}

// --- HANDLERS ---

function setupAutoSaveToggle() {
  const autoSaveBtn = document.getElementById('autoSaveToggle');
  autoSaveBtn?.addEventListener('click', () => toggleAutoSave());
}

function toggleAutoSave(forceState = null) {
  autoSaveEnabled = forceState === null ? !autoSaveEnabled : Boolean(forceState);
  localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(autoSaveEnabled));

  const autoSaveBtn = document.getElementById('autoSaveToggle');
  const span = autoSaveBtn?.querySelector('span');
  
  if (!autoSaveBtn || !span) return;

  if (autoSaveEnabled) {
    autoSaveBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
    autoSaveBtn.classList.add('bg-purple-600', 'hover:bg-purple-700');
    span.textContent = 'Auto-save: On';
    showSaveStatus('Auto-save enabled', 'text-blue-400');
    triggerAutoSave();
  } else {
    autoSaveBtn.classList.remove('bg-purple-600', 'hover:bg-purple-700');
    autoSaveBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
    span.textContent = 'Auto-save: Off';
    showSaveStatus('Auto-save disabled', 'text-gray-300');
  }
}

function restoreAutoSavePreference() {
  try {
    const stored = localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
    if (stored === null) return;
    toggleAutoSave(JSON.parse(stored));
  } catch (_) {}
}

function startStatusRefreshLoop() {
  if (statusRefreshInterval) clearInterval(statusRefreshInterval);

  statusRefreshInterval = setInterval(() => {
    if (unsavedChanges || isSaving || !lastSavedAt) return;
    showSaveStatus(`Last saved ${formatRelativeTime(lastSavedAt)}`, 'text-green-400');
  }, 15000);
}

function triggerAutoSave() {
  if (!autoSaveEnabled || !unsavedChanges) return;

  if (!debouncedAutoSave) {
    debouncedAutoSave = debounce(async () => {
      const form = document.getElementById('profileForm');
      const nameInput = document.getElementById('nameInput');
      if (!form || isSaving || !unsavedChanges) return;

      if (!nameInput?.value.trim()) {
        showSaveStatus('Auto-save paused: Name is required', 'text-yellow-400');
        return;
      }

      await handleSaveProfile({ preventDefault: () => {}, target: form, isAutoSave: true });
    }, 2200);
  }

  debouncedAutoSave();
}

function initSortableLinks() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;

  let draggedItem = null;

  const setDraggedVisualState = (item, isDragging) => {
    if (!item) return;

    item.classList.toggle('scale-[1.02]', isDragging);
    item.classList.toggle('shadow-2xl', isDragging);
    item.classList.toggle('ring-2', isDragging);
    item.classList.toggle('ring-purple-400/50', isDragging);
    item.classList.toggle('bg-gray-600/90', isDragging);
    item.classList.toggle('z-10', isDragging);
    item.classList.toggle('transition-transform', isDragging);
    item.classList.toggle('rotate-1', isDragging);
  };

  container.addEventListener('mousedown', (e) => {
    if (e.target.closest('.handle')) {
      draggedItem = e.target.closest('.social-link-item');
      if (!draggedItem) return;
      draggedItem.style.opacity = '0.7';
      setDraggedVisualState(draggedItem, true);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }
  });

  function onMouseMove(e) {
    if (!draggedItem) return;
    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement) container.insertBefore(draggedItem, afterElement);
    else container.appendChild(draggedItem);
  }

  function onMouseUp() {
    if (draggedItem) {
      draggedItem.style.opacity = '1';
      setDraggedVisualState(draggedItem, false);
      draggedItem = null;
      markUnsavedChanges();
      updateLivePreview();
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.social-link-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  container.addEventListener('touchstart', (e) => {
    if (e.target.closest('.handle')) {
      draggedItem = e.target.closest('.social-link-item');
      if (!draggedItem) return;
      draggedItem.style.opacity = '0.7';
      setDraggedVisualState(draggedItem, true);
      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    }
  });

  function onTouchMove(e) {
    if (!draggedItem) return;
    e.preventDefault();
    const touch = e.touches[0];
    const afterElement = getDragAfterElement(container, touch.clientY);
    if (afterElement) container.insertBefore(draggedItem, afterElement);
    else container.appendChild(draggedItem);
  }

  function onTouchEnd() {
    if (draggedItem) {
      draggedItem.style.opacity = '1';
      setDraggedVisualState(draggedItem, false);
      draggedItem = null;
      markUnsavedChanges();
      updateLivePreview();
    }
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }
}

async function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

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
    
    document.getElementById('profilePicUrl').value = url;
    
    const preview = document.getElementById('profileImagePreview');
    if (preview) preview.src = url;
    
    updateProfilePicStatus('Uploaded successfully!', 'text-green-400');
    markUnsavedChanges();
    triggerAutoSave();
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

  if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);
  const data = await response.json();
  if (!data.secure_url) throw new Error("No secure URL returned from Cloudinary");
  return data.secure_url;
}

function initPhoneFormatting() {
  const phoneInput = document.getElementById('phoneInput');
  if (!phoneInput) return;

  phoneInput.addEventListener('input', (e) => {
    let numbers = e.target.value.replace(/\D/g, '');
    if (!numbers) { e.target.value = ''; return; }
    const formatted = numbers.match(/.{1,3}/g)?.join(' ') || numbers;
    e.target.value = '+' + formatted;
    markUnsavedChanges();
  });
}

function updateTaglineCounter() {
  const input = document.getElementById('taglineInput');
  const counter = document.getElementById('taglineCounter');
  if (!input || !counter) return;
  const remaining = 120 - input.value.length;
  counter.textContent = remaining;
  counter.className = remaining < 20 ? 'text-yellow-400' : 'text-gray-400';
  markUnsavedChanges();
}

function addSocialLink() {
  const container = document.getElementById('socialLinksContainer');
  if (!container) return;
  const currentCount = container.querySelectorAll('input').length;

  if (currentCount >= CONFIG.maxSocialLinks) {
    showAlert('info', 'Maximum Reached', `You can add up to ${CONFIG.maxSocialLinks} social links.`, { icon: 'fas fa-info-circle', duration: 3000 });
    return;
  }

  const div = document.createElement('div');
  div.className = 'social-link-item flex flex-row w-full items-center justify-between gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-700/50 md:bg-gray-700 rounded-lg md:rounded-xl border border-gray-600/30 md:border-transparent';
  div.innerHTML = `
    <button type="button" class="handle text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 transition-colors w-6 md:w-8 text-center" title="Drag to reorder">
      <i class="fas fa-grip-vertical"></i>
    </button>
    <input type="url" name="socialLinks" placeholder="https://example.com" 
           class="flex-1 min-w-0 bg-transparent border-0 border-b-2 border-transparent focus:border-purple-500 px-1 py-1 text-sm md:text-base text-white placeholder-gray-500 transition-colors outline-none truncate">
    <button type="button" class="remove-social-link text-red-400 hover:text-red-300 p-1 transition-colors w-6 md:w-8 text-center">
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
  const count = container?.querySelectorAll('input').length || 0;
  const remaining = CONFIG.maxSocialLinks - count;
  const statusEl = container?.nextElementSibling;
  if (statusEl) {
    statusEl.textContent = `${remaining} links remaining`;
    statusEl.className = `text-xs ${remaining < 3 ? 'text-yellow-400' : 'text-gray-400'} mt-2`;
  }
}

function addUnsavedChangesListener() {
  const form = document.getElementById('profileForm');
  form?.addEventListener('input', markUnsavedChanges);
}

function markUnsavedChanges() {
  unsavedChanges = true;
  showSaveStatus('Unsaved changes', 'text-yellow-400');
  triggerAutoSave();
}

async function handleSaveProfile(e) {
  e?.preventDefault?.();
  const isAutoSaveRun = Boolean(e?.isAutoSave);
  
  const form = e?.target || document.getElementById('profileForm');
  if (!form || isSaving) return;

  const submitBtn = form.querySelector('button[type="submit"]');
  const saveSpinner = document.getElementById('saveSpinner');
  
  const nameInput = document.getElementById('nameInput');
  if (!nameInput.value.trim()) {
    nameInput.classList.add('border-red-500');
    if (isAutoSaveRun) {
      showSaveStatus('Auto-save paused: Name is required', 'text-yellow-400');
      return;
    }
    await showAlert('error', 'Validation Error', 'Name is required');
    nameInput.focus();
    return;
  }

  const profilePicUrl = document.getElementById('profilePicUrl').value.trim();
  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link && isValidUrl(link));

  const updateData = {
    name: nameInput.value.trim(),
    tagline: document.getElementById('taglineInput').value.trim(),
    phone: document.getElementById('phoneInput').value.trim(),
    address: document.getElementById('addressInput').value.trim(),
    profilePic: profilePicUrl,
    socialLinks: socialLinks,
    style: buildBackgroundStyleValue()
  };

  try {
    isSaving = true;

    submitBtn.disabled = true;
    saveSpinner.classList.remove('hidden');
    showSaveStatus(isAutoSaveRun ? 'Auto-saving changes...' : 'Saving changes...', 'text-blue-400');

    const verifyUrl = `${CONFIG.googleEditUrl}?action=verify_session&token=${state.currentUser.sessionToken}`;
    const verifyResponse = await fetch(verifyUrl);
    const sessionData = await verifyResponse.json();

    if (!sessionData.valid) throw new Error('SESSION_EXPIRED');

    const dataString = JSON.stringify(updateData);
    const updateUrl = `${CONFIG.googleEditUrl}?action=update_profile&token=${state.currentUser.sessionToken}&email=${encodeURIComponent(state.currentUser.email)}&data=${encodeURIComponent(dataString)}`;
    
    const updateResponse = await fetch(updateUrl);
    const result = await updateResponse.json();

    if (result.status !== 'success') throw new Error(result.message || 'Save failed');

    unsavedChanges = false;
    lastSavedAt = Date.now();
    state.profileData = { ...state.profileData, ...updateData };
    localStorage.setItem('profileEditorProfile', JSON.stringify(state.profileData));
    showSaveStatus(isAutoSaveRun ? 'Auto-saved just now' : 'Changes saved successfully', 'text-green-400');
    
    updateSidebar();
    updatePublicProfileLink();

  } catch (error) {
    console.error('❌ Save error:', error);
    if (error.message.includes('SESSION_EXPIRED')) {
      await showAlert('error', 'Session Expired', 'Please log in again');
      logout();
      return;
    }
    if (!isAutoSaveRun) await showAlert('error', 'Save Failed', error.message || 'Failed to save changes. Please try again.');
    showSaveStatus('Failed to save changes', 'text-red-400');
  } finally {
    isSaving = false;
    submitBtn.disabled = false;
    saveSpinner.classList.add('hidden');
  }
}

function showSaveStatus(message, className = '') {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;
  if (statusEl.timeoutId) clearTimeout(statusEl.timeoutId);

  const statusIcon = className.includes('green') ? 'fa-circle-check' : className.includes('blue') ? 'fa-rotate' : className.includes('yellow') ? 'fa-triangle-exclamation' : className.includes('red') ? 'fa-circle-xmark' : 'fa-circle-info';
  
  const statusMeta = !unsavedChanges && className.includes('green') && lastSavedAt
    ? `<span class="text-xs text-gray-400">${formatRelativeTime(lastSavedAt)}</span>` : '';

  statusEl.innerHTML = `
    <div class="flex items-center justify-between gap-3 transition-all duration-300">
      <span class="inline-flex items-center gap-2"><i class="fa-solid ${statusIcon}" aria-hidden="true"></i><span>${message}</span></span>
      ${statusMeta}
    </div>
  `;

  const toneClass = className.includes('green') ? 'bg-green-900/20 border-green-600/30' : className.includes('blue') ? 'bg-blue-900/20 border-blue-600/30' : className.includes('yellow') ? 'bg-yellow-900/20 border-yellow-600/30' : className.includes('red') ? 'bg-red-900/20 border-red-600/30' : 'bg-gray-900/40 border-gray-700';

  statusEl.className = `text-sm min-h-[44px] px-3 py-2 rounded-lg border transition-all duration-300 ${className} ${toneClass}`;

  if (className.includes('green') || className.includes('blue')) {
    statusEl.timeoutId = setTimeout(() => {
      if (unsavedChanges) { showSaveStatus('Unsaved changes', 'text-yellow-400'); return; }
      if (lastSavedAt) { showSaveStatus(`Last saved ${formatRelativeTime(lastSavedAt)}`, 'text-green-400'); return; }
      statusEl.innerHTML = '';
      statusEl.className = 'text-sm min-h-[44px] px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40 text-gray-300';
    }, 5000);
  }
}

function formatRelativeTime(timestamp) {
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  try { new URL(string); return true; } catch (_) { return false; }
}