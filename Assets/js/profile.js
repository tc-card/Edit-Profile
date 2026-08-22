import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles, initDraggableLinks } from './utils.js';
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

  DOM.loginScreen.classList.add('hidden');
  DOM.dashboard.classList.remove('hidden');
  
  updateSidebar();
  updatePublicProfileLink();
  
  renderProfileForm();
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
    <!-- Mobile-first reset & Styles -->
    <style>
      #profileEditor {
        background: transparent !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      .handle {
        touch-action: none;
      }
    </style>

    <form id="profileForm" class="space-y-4 md:space-y-6">
      
      <div class="p-3 md:p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <q class="text-xs text-gray-400 italic block">${lastEditMessage}</q>
          <h1 class="text-xl md:text-2xl font-bold text-purple-400">${escapeHtml(profileData.name) || 'No Name'}</h1>
        </div>
        <button type="button" id="autoSaveToggle" class="text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all flex items-center gap-2 bg-gray-700 hover:bg-gray-600">
          <i class="fas fa-clock"></i>
          <span>Auto-save: Off</span>
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderPersonalInfoSection(profileData)}
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderSocialLinksSection(profileData)}
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderStyleControlsSection(profileData)}
        </div>

        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          <h2 class="text-lg md:text-xl font-semibold text-purple-400 mb-3 md:mb-4">Live Preview</h2>
          <div id="livePreviewContainer" class="w-full aspect-[4/5] min-h-[500px] md:min-h-[650px] max-h-[750px] rounded-xl overflow-hidden shadow-lg bg-gray-800 pointer-events-none border border-gray-600/50"></div>
          <p class="text-xs text-center text-gray-500 mt-2 italic">Matches the public view exactly</p>
        </div>
      </div>

      <div class="mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 md:p-6">
        <div id="saveStatus" aria-live="polite" class="inline-flex items-center text-sm text-gray-300"></div>
        <div class="flex items-center gap-3">
          <button type="submit" class="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
            <span id="saveBtnText">Save Changes</span>
            <span id="saveSpinner" class="hidden"><i class="fas fa-spinner fa-spin"></i></span>
          </button>
          <a href="https://termination.tccards.tn/" target="_blank" class="inline-flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-500/20">
            <i class="fas fa-trash-alt text-sm"></i>
            <span class="text-sm">Delete</span>
          </a>
        </div>
      </div>

    </form>
  `;

  try {
    initializeForm();
  } catch (error) {
    console.error("Form initialization error (preview will still work):", error);
  }
  
  updateLivePreview();
}

function renderPersonalInfoSection(profileData) {
  const taglineLength = profileData.tagline?.length || 0;
  return `
    <h2 class="text-lg md:text-xl font-semibold text-purple-400 mb-3 md:mb-4">Personal Information</h2>
    <div class="space-y-3 md:space-y-4">
      <div>
        <label for="nameInput" class="block text-xs md:text-sm text-gray-300 mb-1">Name *</label>
        <input id="nameInput" type="text" name="name" value="${escapeHtml(profileData.name) || ''}" required class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="taglineInput" class="block text-xs md:text-sm text-gray-300 mb-1">Tagline</label>
        <input id="taglineInput" type="text" name="tagline" value="${escapeHtml(profileData.tagline) || ''}" maxlength="120" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
        <p class="text-xs text-gray-400 mt-1 text-right"><span id="taglineCounter">${120 - taglineLength}</span>/120 characters left</p>
      </div>
      <div>
        <label for="phoneInput" class="block text-xs md:text-sm text-gray-300 mb-1">Phone</label>
        <input id="phoneInput" type="tel" name="phone" value="${escapeHtml(profileData.phone) || ''}" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
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
          <button type="button" id="uploadImageBtn" class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700 rounded border border-gray-600 hover:border-purple-500 text-sm transition-colors">
            <i class="fas fa-upload mr-2"></i> Upload
          </button>
          <input type="hidden" id="profilePicUrl" value="${profileData.profilePic || ''}">
          <span id="profilePicStatus" class="text-xs text-gray-400 truncate max-w-[150px]">${profileData.profilePic ? 'Image set' : 'No image selected'}</span>
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
    <h2 class="text-lg md:text-xl font-semibold text-purple-400 mb-3 md:mb-4">Profile Style</h2>

    <div id="presetGradientsContainer" class="mb-4 ${gradientEnabled ? '' : 'hidden'}">
      <p class="text-xs uppercase tracking-wide text-gray-400 mb-2">One-Click Presets</p>
      <div class="flex flex-wrap gap-3">
        <button type="button" data-gradient="ocean" class="w-8 h-8 rounded-full border-2 border-transparent hover:border-purple-400 transition-all" style="background: linear-gradient(135deg, #2b6777, #c8d8e4);" title="Ocean"></button>
        <button type="button" data-gradient="sunset" class="w-8 h-8 rounded-full border-2 border-transparent hover:border-purple-400 transition-all" style="background: linear-gradient(135deg, #ff512f, #f09819);" title="Sunset"></button>
        <button type="button" data-gradient="midnight" class="w-8 h-8 rounded-full border-2 border-transparent hover:border-purple-400 transition-all" style="background: linear-gradient(135deg, #000428, #004e92);" title="Midnight"></button>
        <button type="button" data-gradient="neon" class="w-8 h-8 rounded-full border-2 border-transparent hover:border-purple-400 transition-all" style="background: linear-gradient(135deg, #00c6ff, #0072ff);" title="Neon"></button>
        <button type="button" data-gradient="purple" class="w-8 h-8 rounded-full border-2 border-transparent hover:border-purple-400 transition-all" style="background: linear-gradient(135deg, #7c3aed, #1d4ed8);" title="Purple"></button>
      </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div>
        <label for="backgroundType" class="block text-xs md:text-sm text-gray-300 mb-1">Background Type</label>
        <select id="backgroundType" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          <option value="gradient" ${gradientEnabled ? 'selected' : ''}>Gradient</option>
          <option value="image" ${!gradientEnabled ? 'selected' : ''}>Image URL</option>
        </select>
      </div>
      <div id="gradientDirectionGroup" class="${gradientEnabled ? '' : 'hidden'}">
        <label for="gradientDirection" class="block text-xs md:text-sm text-gray-300 mb-1">Gradient Direction</label>
        <select id="gradientDirection" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          ${renderGradientDirectionOptions(direction)}
        </select>
      </div>
    </div>

    <div id="gradientInputsGroup" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 ${gradientEnabled ? '' : 'hidden'}">
      <div>
        <label for="gradientColor1" class="block text-xs md:text-sm text-gray-300 mb-1">Color 1</label>
        <input id="gradientColor1" type="color" value="${color1}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor2" class="block text-xs md:text-sm text-gray-300 mb-1">Color 2</label>
        <input id="gradientColor2" type="color" value="${color2}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor3" class="block text-xs md:text-sm text-gray-300 mb-1">Color 3</label>
        <input id="gradientColor3" type="color" value="${color3}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
    </div>

    <div id="imageInputsGroup" class="mb-4 ${gradientEnabled ? 'hidden' : ''}">
      <label for="backgroundImageUrl" class="block text-xs md:text-sm text-gray-300 mb-1">Background Image URL</label>
      <input id="backgroundImageUrl" type="url" value="${escapeHtml(imageUrl)}" placeholder="https://example.com/background.jpg" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      <p class="text-xs text-gray-400 mt-1">Use a direct image URL only.</p>
    </div>
  `;
}

function renderSocialLinksSection(profileData) {
  const socialLinks = profileData.socialLinks || [];
  const remainingLinks = CONFIG.maxSocialLinks - socialLinks.length;

  return `
    <div class="space-y-3 md:space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg md:text-xl font-semibold text-purple-400">Social Links</h2>
        <button type="button" id="addSocialLink" class="text-xs md:text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"><i class="fas fa-plus"></i> Add</button>
      </div>
      <div id="socialLinksContainer" class="space-y-2 md:space-y-3 w-full">
        ${socialLinks.map((link, index) => `
          <div class="social-link-item flex flex-row w-full items-center justify-between gap-1.5 md:gap-2 p-1.5 md:p-2 bg-gray-700/50 md:bg-gray-700 rounded-lg md:rounded-xl border border-gray-600/30 md:border-transparent" data-index="${index}">
            <button type="button" class="handle text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing p-1 transition-colors w-6 md:w-8 text-center" title="Drag to reorder">
              <i class="fas fa-grip-vertical"></i>
            </button>
            <input type="url" name="socialLinks" value="${escapeHtml(link)}" class="flex-1 min-w-0 bg-transparent border-0 border-b-2 border-transparent focus:border-purple-500 px-1 py-1 text-sm md:text-base text-white placeholder-gray-500 transition-colors outline-none truncate" placeholder="https://example.com">
            <button type="button" class="remove-social-link text-red-400 hover:text-red-300 p-1 transition-colors w-6 md:w-8 text-center">
              <i class="fas fa-times"></i>
            </button>
          </div>
        `).join('')}
      </div>
      <p class="text-xs ${remainingLinks < 3 ? 'text-yellow-400' : 'text-gray-400'} mt-1">${remainingLinks} links remaining</p>
    </div>
  `;
}

// --- PREVIEW LOGIC (LITERAL URL HANDLING) ---
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

function buildPublicPreviewHtml(data) {
  const { name, tagline, profilePic, socialLinks, background, email, phone, address } = data;
  const currentYear = new Date().getFullYear();

  const bgStyle = background && background.trim() !== '' && background !== 'http' 
    ? `background: ${background}; background-size: cover; background-position: center; background-repeat: no-repeat;` 
    : `background: linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23)); background-size: cover; background-position: center;`;

  return `
    <div class="w-full h-full overflow-hidden" style="${bgStyle}">
      <div class="w-full h-full flex items-center justify-center p-4" style="background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);">
        <div class="w-full max-w-md p-6">
          
          <div class="w-full flex justify-end mb-2">
            <div class="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center" style="background: rgba(0,0,0,0.2);">
              <i class="fas fa-share-alt text-gray-400 text-sm"></i>
            </div>
          </div>

          <div class="w-full flex justify-center mb-4">
            <img src="${profilePic || 'https://tccards.tn/Assets/default.png'}" class="w-32 h-32 bg-gray-800 rounded-full object-cover" alt="Profile" onerror="this.src='https://tccards.tn/Assets/default.png'">
          </div>

          <div class="w-full h-12 bg-gray-800 rounded mb-2 flex items-center justify-center shadow-lg">
            <h1 class="text-2xl font-bold text-white">${escapeHtml(name) || 'Your Name'}</h1>
          </div>

          ${tagline ? `<p class="tagline-text flex items-center justify-center">${escapeHtml(tagline)}</p>` : ''}

          <div class="w-full bg-transparent mb-4">${renderSocialLinksPreview(socialLinks)}</div>
        </div>
      </div>
    </div>
  `;
}

function updateLivePreview() {
  const container = document.getElementById('livePreviewContainer');
  if (!container) return;

  const name = document.getElementById('nameInput')?.value || '';
  const tagline = document.getElementById('taglineInput')?.value || '';
  const profilePic = document.getElementById('profilePicUrl')?.value || '';
  const email = ''; 
  const phone = document.getElementById('phoneInput')?.value || '';
  const address = document.getElementById('addressInput')?.value || '';
  const background = getBackgroundValueFromForm();
  
  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link);

  container.innerHTML = buildPublicPreviewHtml({ name, tagline, profilePic, socialLinks, background, email, phone, address });
}

// --- QR CODE GENERATOR SECTION ---
export function renderQRCodeSection() {
  const profileId = state.profileData?.id?.toString().trim() || '';
  const profileLink = state.profileData?.link?.trim() || '';
  const qrData = profileId ? `https://card.tccards.tn/id_${profileId}` : (profileLink ? `https://card.tccards.tn/@${profileLink.replace(/^@/, '')}` : '');

  DOM.profileEditor.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-8">
      <div class="flex-1 space-y-6 min-w-0">
        <div class="flex items-start justify-between">
          <div><h2 class="text-2xl font-bold text-purple-400">QR Code Studio</h2><p class="text-sm text-gray-400 mt-1">Generate a high-quality QR code linking to your live profile.</p></div>
        </div>
        <div class="rounded-xl border border-gray-700 bg-gray-800/80 p-4">
          <p class="text-xs uppercase tracking-wide text-gray-500 mb-2">Encoded Link</p>
          <p class="text-sm text-blue-300 break-all select-all">${qrData ? escapeHtml(qrData) : '<span class="text-yellow-400">Save your profile first to generate a QR</span>'}</p>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-300 mb-3">Quick Style Templates</p>
          <div id="presetsContainer" class="grid grid-cols-3 gap-2">
            <button data-preset="dark" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-black mb-1"></span><span class="text-[10px] text-gray-300">Dark</span></button>
            <button data-preset="vibrant" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-purple-600 mb-1"></span><span class="text-[10px] text-gray-300">Vibrant</span></button>
            <button data-preset="neon" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-green-400 mb-1"></span><span class="text-[10px] text-gray-300">Neon</span></button>
            <button data-preset="elegant" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-yellow-600 mb-1"></span><span class="text-[10px] text-gray-300">Elegant</span></button>
            <button data-preset="corporate" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-blue-700 mb-1"></span><span class="text-[10px] text-gray-300">Corporate</span></button>
            <button data-preset="minimal" class="p-2 rounded-lg border border-gray-600 hover:ring-2 hover:ring-purple-500 bg-gray-800 transition-all text-center"><span class="block w-full h-4 rounded bg-white mb-1 border border-gray-500"></span><span class="text-[10px] text-gray-300">Minimal</span></button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-700/60 pt-4">
          <div><label for="qrForeground" class="block text-sm text-gray-300 mb-1">Foreground</label><div class="flex items-center gap-2"><input type="color" id="qrForeground" value="#111111" class="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 cursor-pointer p-1"><span id="qrForegroundText" class="text-xs text-gray-400 font-mono">#111111</span></div></div>
          <div><label for="qrBackground" class="block text-sm text-gray-300 mb-1">Background</label><div class="flex items-center gap-2"><input type="color" id="qrBackground" value="#ffffff" class="w-10 h-10 rounded-full bg-gray-700 border border-gray-600 cursor-pointer p-1"><span id="qrBackgroundText" class="text-xs text-gray-400 font-mono">#ffffff</span></div></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label for="qrDotStyle" class="block text-sm text-gray-300 mb-1">Dot Pattern</label><select id="qrDotStyle" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"><option value="square">Square</option><option value="dots">Dots</option><option value="rounded" selected>Rounded</option><option value="classy">Classy</option><option value="classy-rounded">Classy Rounded</option></select></div>
          <div><label for="qrCornerStyle" class="block text-sm text-gray-300 mb-1">Corner Style</label><select id="qrCornerStyle" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"><option value="square">Square</option><option value="extra-rounded" selected>Rounded</option><option value="dot">Dot</option></select></div>
        </div>
        <div class="border-t border-gray-700/60 pt-4">
          <label class="block text-sm text-gray-300 mb-1">Branding (Upload Logo)</label>
          <div class="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 border border-dashed border-gray-600 hover:border-purple-500 transition-colors cursor-pointer" id="logoUploadArea">
            <div id="logoPreviewContainer" class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-gray-600"><span class="text-xs text-gray-500"><i class="fas fa-image"></i></span></div>
            <div class="flex-1 min-w-0"><p class="text-sm text-gray-300 font-medium">Upload your logo</p><p class="text-xs text-gray-500 truncate" id="logoFileName">PNG, JPG recommended (max 2MB)</p></div>
            <input type="file" id="qrLogoInput" accept="image/*" class="hidden">
          </div>
        </div>
        <div class="flex flex-wrap gap-3 pt-2">
          <button id="downloadQrBtn" class="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-5 rounded-lg transition-colors font-medium"><i class="fas fa-download"></i> Download PNG</button>
          <button id="refreshQrBtn" type="button" class="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-5 rounded-lg transition-colors"><i class="fas fa-rotate"></i> Reset</button>
        </div>
      </div>
      <div class="w-full lg:w-[450px] shrink-0 flex flex-col items-center justify-start rounded-xl border border-gray-700 bg-gray-800/70 p-6">
        <div id="qrCodeContainer" class="w-full flex justify-center bg-white rounded-xl p-4 shadow-lg"></div>
        <div class="mt-4 text-center"><p class="text-xs text-gray-400">Scan this code to open your profile directly</p></div>
      </div>
    </div>
  `;
  setupQRCodeListeners(qrData);
}

// --- QR CODE EVENT LISTENERS ---
function setupQRCodeListeners(url) {
  const container = document.getElementById('qrCodeContainer');
  const foregroundInput = document.getElementById('qrForeground');
  const foregroundText = document.getElementById('qrForegroundText');
  const backgroundInput = document.getElementById('qrBackground');
  const backgroundText = document.getElementById('qrBackgroundText');
  const dotStyleInput = document.getElementById('qrDotStyle');
  const cornerStyleInput = document.getElementById('qrCornerStyle');
  const logoInput = document.getElementById('qrLogoInput');
  const logoPreviewContainer = document.getElementById('logoPreviewContainer');
  const logoFileName = document.getElementById('logoFileName');
  const refreshBtn = document.getElementById('refreshQrBtn');
  const downloadBtn = document.getElementById('downloadQrBtn');
  const presetsContainer = document.getElementById('presetsContainer');

  if (!container || !downloadBtn) return;
  const QRStyling = window.QRCodeStyling;
  if (!QRStyling) { container.innerHTML = `<p class="text-red-400 text-sm">QR library missing. Please include qrcode-styling.</p>`; return; }

  const getQrTarget = () => { return url || ''; };
  const getOptions = () => ({
    width: 320, height: 320, data: getQrTarget(), image: uploadedLogoUrl || undefined, margin: 10,
    qrOptions: { errorCorrectionLevel: 'H' },
    dotsOptions: { color: foregroundInput?.value || '#111111', type: dotStyleInput?.value || 'rounded' },
    cornersSquareOptions: { color: foregroundInput?.value || '#111111', type: cornerStyleInput?.value || 'extra-rounded' },
    cornersDotOptions: { color: foregroundInput?.value || '#111111', type: cornerStyleInput?.value === 'dot' ? 'dot' : 'square' },
    backgroundOptions: { color: backgroundInput?.value || '#ffffff' },
    imageOptions: { crossOrigin: 'anonymous', margin: 6, imageSize: 0.22 }
  });

  const renderQR = () => {
    const target = getQrTarget();
    if (!target) { container.innerHTML = `<p class="text-yellow-400 text-sm">Save your profile first to generate a QR code.</p>`; return; }
    if (qrCodeInstance) { container.innerHTML = ''; qrCodeInstance = null; }
    qrCodeInstance = new QRStyling(getOptions());
    qrCodeInstance.append(container);
  };

  foregroundInput?.addEventListener('input', () => { foregroundText.textContent = foregroundInput.value; renderQR(); });
  backgroundInput?.addEventListener('input', () => { backgroundText.textContent = backgroundInput.value; renderQR(); });
  [dotStyleInput, cornerStyleInput].forEach((input) => { input?.addEventListener('change', renderQR); });

  presetsContainer?.addEventListener('click', (e) => {
    const presetBtn = e.target.closest('[data-preset]');
    if (!presetBtn) return;
    const presets = {
      dark: { fg: '#000000', bg: '#ffffff', dot: 'rounded', corner: 'extra-rounded' },
      vibrant: { fg: '#7c3aed', bg: '#fafafa', dot: 'square', corner: 'square' },
      neon: { fg: '#10b981', bg: '#0f172a', dot: 'dots', corner: 'dot' },
      elegant: { fg: '#b45309', bg: '#fef3c7', dot: 'classy-rounded', corner: 'extra-rounded' },
      corporate: { fg: '#1d4ed8', bg: '#f8fafc', dot: 'square', corner: 'square' },
      minimal: { fg: '#111111', bg: '#ffffff', dot: 'square', corner: 'square' }
    };
    const p = presets[presetBtn.dataset.preset];
    if (!p) return;
    foregroundInput.value = p.fg; backgroundInput.value = p.bg; dotStyleInput.value = p.dot; cornerStyleInput.value = p.corner;
    foregroundText.textContent = p.fg; backgroundText.textContent = p.bg; renderQR();
  });

  logoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showAlert('error', 'File Too Large', 'Logo must be smaller than 2MB.'); logoInput.value = ''; return; }
    if (uploadedLogoUrl) { URL.revokeObjectURL(uploadedLogoUrl); uploadedLogoUrl = null; }
    uploadedLogoUrl = URL.createObjectURL(file);
    logoPreviewContainer.innerHTML = `<img src="${uploadedLogoUrl}" class="w-full h-full object-cover">`;
    logoFileName.textContent = file.name;
    renderQR();
  });

  document.getElementById('logoUploadArea')?.addEventListener('click', () => { logoInput?.click(); });
  const refresh = () => {
    if (uploadedLogoUrl) { URL.revokeObjectURL(uploadedLogoUrl); uploadedLogoUrl = null; }
    logoInput.value = ''; logoPreviewContainer.innerHTML = `<span class="text-xs text-gray-500"><i class="fas fa-image"></i></span>`;
    logoFileName.textContent = 'PNG, JPG recommended (max 2MB)'; renderQR();
  };
  refreshBtn?.addEventListener('click', refresh);
  downloadBtn.addEventListener('click', () => {
    if (qrCodeInstance) { qrCodeInstance.download({ name: `QRCode-${state.profileData?.id || 'profile'}`, extension: 'png' }); } 
    else { showAlert('error', 'Error', 'QR Code not generated yet.'); }
  });
  renderQR();
}

// --- ANALYTICS SECTION ---
export async function renderAnalyticsSection() {
  DOM.profileEditor.innerHTML = `
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-purple-400">Analytics Dashboard</h2>
        <button id="refreshAnalyticsBtn" class="text-sm px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 transition-colors flex items-center gap-2"><i class="fas fa-sync-alt"></i> Refresh</button>
      </div>
      <div id="analyticsLoader" class="flex justify-center items-center py-12 text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i> Loading your stats...</div>
      <div id="analyticsContent" class="hidden space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-gray-800/70 p-4 rounded-lg border border-gray-600/50 text-center"><p class="text-xs text-gray-400 uppercase tracking-wider">Total Visits</p><p id="totalVisits" class="text-3xl font-bold text-purple-400">0</p></div>
          <div class="bg-gray-800/70 p-4 rounded-lg border border-gray-600/50 text-center"><p class="text-xs text-gray-400 uppercase tracking-wider">Profile Shared</p><p id="totalShares" class="text-3xl font-bold text-blue-400">0</p></div>
          <div class="bg-gray-800/70 p-4 rounded-lg border border-gray-600/50 text-center"><p class="text-xs text-gray-400 uppercase tracking-wider">Contact Saved</p><p id="totalSaves" class="text-3xl font-bold text-emerald-400">0</p></div>
          <div class="bg-gray-800/70 p-4 rounded-lg border border-gray-600/50 text-center"><p class="text-xs text-gray-400 uppercase tracking-wider">Contact Copied</p><p id="totalCopies" class="text-3xl font-bold text-yellow-400">0</p></div>
        </div>
        <div class="bg-gray-800/70 p-6 rounded-lg border border-gray-600/50"><h3 class="text-lg font-semibold text-gray-200 mb-4">Most Clicked Links</h3><div id="topLinksList" class="space-y-2"><p class="text-sm text-gray-500 italic">No link clicks tracked yet.</p></div></div>
      </div>
    </div>
  `;
  fetchAndRenderAnalytics();
}

async function fetchAndRenderAnalytics() {
  const loader = document.getElementById('analyticsLoader');
  const content = document.getElementById('analyticsContent');
  const refreshBtn = document.getElementById('refreshAnalyticsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', fetchAndRenderAnalytics);

  try {
    const userId = state.profileData?.id?.toString().trim() || state.profileData?.link?.trim() || 'guest';
    const url = `${CONFIG.googleEditUrl}?action=getAnalytics&user=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const stats = result.data;
      document.getElementById('totalVisits').textContent = stats.visits || 0;
      document.getElementById('totalShares').textContent = stats.shares || 0;
      document.getElementById('totalSaves').textContent = stats.saves || 0;
      document.getElementById('totalCopies').textContent = stats.copies || 0;

      const linkContainer = document.getElementById('topLinksList');
      const clickData = stats.link_clicks || {};
      if (Object.keys(clickData).length === 0) {
        linkContainer.innerHTML = `<p class="text-sm text-gray-500 italic">No link clicks tracked yet.</p>`;
      } else {
        const sortedLinks = Object.entries(clickData).sort((a, b) => b[1] - a[1]);
        linkContainer.innerHTML = sortedLinks.map(([link, count]) => `
          <div class="flex items-center justify-between py-2 border-b border-gray-700/50">
            <span class="text-sm text-blue-300 truncate max-w-[70%]">${escapeHtml(link)}</span>
            <span class="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full font-medium">${count} clicks</span>
          </div>
        `).join('');
      }
      loader.classList.add('hidden');
      content.classList.remove('hidden');
    } else {
      throw new Error(result.message || 'Failed to load data');
    }
  } catch (error) {
    console.error('Analytics Error:', error);
    loader.innerHTML = `<p class="text-red-400 text-sm">Could not load analytics data. Please try refreshing.</p>`;
  }
}

// --- INITIALIZATION & EVENTS ---
export function initializeForm() {
  setupFormEvents();
  setupNavigationProtection();
  initPhoneFormatting();
  setupAutoSaveToggle();
  addUnsavedChangesListener();
  initDraggableLinks(document.getElementById('socialLinksContainer'), markUnsavedChanges);
  setupPresetGradients();
  restoreAutoSavePreference();
  startStatusRefreshLoop();
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupFormEvents() {
  const form = document.getElementById('profileForm');
  form?.addEventListener('submit', handleSaveProfile);
  document.getElementById('uploadImageBtn')?.addEventListener('click', () => { document.getElementById('profilePicInput')?.click(); });
  document.getElementById('profilePicInput')?.addEventListener('change', handleProfilePicUpload);
  document.getElementById('addSocialLink')?.addEventListener('click', addSocialLink);
  document.getElementById('taglineInput')?.addEventListener('input', updateTaglineCounter);
  setupBackgroundStyleEvents();
}

export async function promptUnsavedChanges() {
  if (!unsavedChanges) return true; 
  const result = await Swal.fire({
    title: 'Unsaved Changes', text: 'You have unsaved changes. Are you sure you want to leave this page?',
    icon: 'warning', showCancelButton: true, confirmButtonColor: '#7c3aed', cancelButtonColor: '#d33',
    confirmButtonText: 'Leave', cancelButtonText: 'Stay', background: '#1e293b', color: '#f8fafc', backdrop: 'rgba(0, 0, 0, 0.8)'
  });
  return result.isConfirmed;
}

function setupNavigationProtection() {
  DOM.publicProfileLink?.addEventListener('click', async (e) => {
    if (unsavedChanges) { e.preventDefault(); const confirmed = await promptUnsavedChanges(); if (confirmed) window.location.href = DOM.publicProfileLink.href; }
  });
  const deleteLink = document.querySelector('a[href="https://termination.tccards.tn/"]');
  if (deleteLink) {
    deleteLink.addEventListener('click', async (e) => {
      if (unsavedChanges) { e.preventDefault(); const confirmed = await promptUnsavedChanges(); if (confirmed) window.location.href = deleteLink.href; }
    });
  }
}

function handleBeforeUnload(e) {
  if (unsavedChanges) { e.preventDefault(); e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'; }
}

function setupBackgroundStyleEvents() {
  const typeInput = document.getElementById('backgroundType');
  const directionInput = document.getElementById('gradientDirection');
  const color1Input = document.getElementById('gradientColor1');
  const color2Input = document.getElementById('gradientColor2');
  const color3Input = document.getElementById('gradientColor3');
  const imageUrlInput = document.getElementById('backgroundImageUrl');

  const syncAll = () => {
    updateBackgroundInputsVisibility();
    updateLivePreview();
    markUnsavedChanges();
  };

  [typeInput, directionInput, color1Input, color2Input, color3Input, imageUrlInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('input', syncAll);
    input.addEventListener('change', syncAll);
  });

  updateBackgroundInputsVisibility();
}

function setupPresetGradients() {
  const container = document.getElementById('presetGradientsContainer');
  if (!container) return;

  const syncAll = () => {
    updateBackgroundInputsVisibility();
    updateLivePreview();
    markUnsavedChanges();
  };

  const presets = {
    ocean: ['#2b6777', '#c8d8e4', '#2b6777'],
    sunset: ['#ff512f', '#f09819', '#ff512f'],
    midnight: ['#000428', '#004e92', '#000428'],
    neon: ['#00c6ff', '#0072ff', '#00c6ff'],
    purple: ['#7c3aed', '#1d4ed8', '#0f172a']
  };

  container.querySelectorAll('button[data-gradient]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.gradient;
      const colors = presets[key];
      if (!colors) return;

      const color1Input = document.getElementById('gradientColor1');
      const color2Input = document.getElementById('gradientColor2');
      const color3Input = document.getElementById('gradientColor3');
      const typeInput = document.getElementById('backgroundType');

      if (color1Input && color2Input && color3Input && typeInput) {
        typeInput.value = 'gradient';
        color1Input.value = colors[0];
        color2Input.value = colors[1];
        color3Input.value = colors[2];
        syncAll();
      }
    });
  });
}

function updateBackgroundInputsVisibility() {
  const typeInput = document.getElementById('backgroundType');
  const gradientGroup = document.getElementById('gradientInputsGroup');
  const imageGroup = document.getElementById('imageInputsGroup');
  const directionGroup = document.getElementById('gradientDirectionGroup');
  const presetsContainer = document.getElementById('presetGradientsContainer');
  const imageUrlInput = document.getElementById('backgroundImageUrl');

  if (!typeInput || !gradientGroup || !imageGroup || !presetsContainer) return;

  const isGradient = typeInput.value !== 'image';
  
  gradientGroup.classList.toggle('hidden', !isGradient);
  imageGroup.classList.toggle('hidden', isGradient);
  presetsContainer.classList.toggle('hidden', !isGradient);
  if (directionGroup) { directionGroup.classList.toggle('hidden', !isGradient); }

  if (isGradient && imageUrlInput?.value.trim()) {
    const color1Input = document.getElementById('gradientColor1');
    const color2Input = document.getElementById('gradientColor2');
    const color3Input = document.getElementById('gradientColor3');
    
    if (color1Input && color2Input && color3Input) {
      color1Input.value = '#2b6777';
      color2Input.value = '#c8d8e4';
      color3Input.value = '#2b6777';
    }
    imageUrlInput.value = '';
    updateLivePreview();
    markUnsavedChanges();
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
    let url = match?.[1] || '';
    // STRICTLY LITERAL: We do NOT manipulate the URL at all.
    return { type: 'image', imageUrl: url || '' };
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
  if (!url) return '';
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
      if (!nameInput?.value.trim()) { showSaveStatus('Auto-save paused: Name is required', 'text-yellow-400'); return; }
      await handleSaveProfile({ preventDefault: () => {}, target: form, isAutoSave: true });
    }, 2200);
  }
  debouncedAutoSave();
}

async function handleProfilePicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    await showAlert('error', 'Invalid File', 'Please upload a JPG, PNG, GIF, or WEBP image');
    event.target.value = ''; return;
  }
  if (file.size > 2 * 1024 * 1024) {
    await showAlert('error', 'File Too Large', 'Maximum file size is 2MB');
    event.target.value = ''; return;
  }
  try {
    updateProfilePicStatus('Uploading...', 'text-blue-400');
    const url = await uploadToCloudinary(file);
    document.getElementById('profilePicUrl').value = url;
    const preview = document.getElementById('profileImagePreview');
    if (preview) preview.src = url;
    updateProfilePicStatus('Uploaded successfully!', 'text-green-400');
    markUnsavedChanges();
    updateLivePreview();
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
  const response = await fetch("https://api.cloudinary.com/v1_1/dufg7fm4stt/image/upload", { method: "POST", body: formData });
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
    <input type="url" name="socialLinks" placeholder="https://example.com" class="flex-1 min-w-0 bg-transparent border-0 border-b-2 border-transparent focus:border-purple-500 px-1 py-1 text-sm md:text-base text-white placeholder-gray-500 transition-colors outline-none truncate">
    <button type="button" class="remove-social-link text-red-400 hover:text-red-300 p-1 transition-colors w-6 md:w-8 text-center">
      <i class="fas fa-times"></i>
    </button>
  `;
  div.querySelector('.remove-social-link').addEventListener('click', () => {
    div.remove(); updateRemainingLinks(); markUnsavedChanges();
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
    if (isAutoSaveRun) { showSaveStatus('Auto-save paused: Name is required', 'text-yellow-400'); return; }
    await showAlert('error', 'Validation Error', 'Name is required');
    nameInput.focus(); return;
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
      logout(); return;
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
  statusEl.innerHTML = `<div class="flex items-center justify-between gap-3 transition-all duration-300 w-full"><span class="inline-flex items-center gap-2"><i class="fa-solid ${statusIcon}" aria-hidden="true"></i><span>${message}</span></span></div>`;
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
  return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function isValidUrl(string) {
  try { new URL(string); return true; } catch (_) { return false; }
}