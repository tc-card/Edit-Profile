import { CONFIG, DOM, state } from './config.js';
import { showAlert, debounce, styles, initDraggableLinks } from './utils.js';
import { logout } from './auth.js';
import { buildPublicPreviewHtml } from './preview.js';

let unsavedChanges = false;
let changeVersion = 0;
let autoSaveEnabled = false;
let debouncedAutoSave;
let isSaving = false;
let lastSavedAt = null;
let statusRefreshInterval = null;
let qrCodeInstance = null;
let uploadedimageUrl = null;
let statusDismissed = false;

const AUTO_SAVE_STORAGE_KEY = 'profileEditorAutoSaveEnabled';
const APP_THEME_STORAGE_KEY = 'profileEditorAppTheme';

// ═══════════════════════════════════════════════════════════════
// STYLE STORAGE MODEL
// ─────────────────────────────────────────────────────────────
// The style column stores either a gradient or url('...')/theme.
// ═══════════════════════════════════════════════════════════════

export async function loadProfileData() {
  if (!state.profileData) return;

  applyAppTheme(localStorage.getItem(APP_THEME_STORAGE_KEY) || 'dark');
  DOM.loginScreen.classList.add('hidden');
  DOM.dashboard.classList.remove('hidden');

  updateSidebar();
  updatePublicProfileLink();

  renderProfileForm();
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
  const editorGreeting = renderEditorGreeting(profileData, lastEditMessage);

  DOM.profileEditor.innerHTML = `
    <style>
      #profileEditor { background: transparent !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
      .handle { touch-action: none; }
    </style>

    <form id="profileForm" class="dashboard-view-shell flex flex-col space-y-4 md:space-y-6">
      <div class="editor-greeting flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="text-xs uppercase tracking-wider text-blue-100/80 mb-1">Welcome back</p>
          <h1 class="text-2xl md:text-3xl font-bold text-white leading-tight">${editorGreeting.name}</h1>
          <p class="text-sm md:text-base text-blue-50/90 mt-2 max-w-2xl">${editorGreeting.message}</p>
          <p class="text-[11px] text-blue-100/70 mt-3">${lastEditMessage}</p>
        </div>
        <button type="button" id="autoSaveToggle" class="editor-greeting-action text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all flex items-center gap-2">
          <i class="fas fa-clock"></i>
          <span>Auto-save: Off</span>
        </button>
      </div>

      <div class="profile-action-bar z-30 flex items-center justify-between gap-3 p-2 -mx-1">
        <div id="saveStatus" aria-live="polite" class="save-status-toast flex-1 min-w-0 inline-flex items-center text-sm text-gray-300"></div>
        <div class="flex items-center gap-2">
          <button type="button" id="cancelChangesBtn" class="hidden inline-flex items-center justify-center w-10 h-10 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors" aria-label="Cancel unsaved changes" title="Cancel unsaved changes">
            <i class="fas fa-rotate-left" aria-hidden="true"></i>
          </button>
          <button id="saveProfileBtn" type="submit" class="inline-flex items-center justify-center w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md" aria-label="Save changes" title="Save changes">
            <i id="saveBtnIcon" class="fas fa-check" aria-hidden="true"></i>\
            <span id="saveSpinner" class="hidden"><i class="fas fa-spinner fa-spin"></i></span>
          </button>
        </div>
      </div>

      <div class="profile-editor-grid grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div class="editor-section-card bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderPersonalInfoSection(profileData)}
        </div>

        <div class="editor-section-card bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderSocialLinksSection(profileData)}
        </div>

        <div class="editor-section-card bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          ${renderStyleControlsSection(profileData)}
          <h2 class="text-lg md:text-xl font-semibold text-gray-100 mb-3 md:mb-4">Profile Image</h2>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <input type="file" id="profilePicInput" accept="image/*" class="hidden">
              <button type="button" id="uploadImageBtn" class="px-3 py-1.5 md:px-4 md:py-2 bg-gray-700 rounded border border-gray-600 hover:border-blue-500 text-sm transition-colors">
                <i class="fas fa-upload mr-2"></i> Upload
              </button>
              <input type="hidden" id="profilePicUrl" value="${escapeHtml(profileData.profilePic)}">
              <span id="profilePicStatus" class="text-xs text-gray-400 truncate max-w-[150px]">${profileData.profilePic ? 'Image set' : 'No image selected'}</span>
            </div>
            <p class="text-[10px] text-gray-400 mt-1">Max 2MB (JPG, PNG, GIF, WEBP)</p>
          </div>
        </div>

        <div class="editor-section-card preview-editor-card bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 shadow-lg border border-gray-700/50">
          <h2 class="text-lg md:text-xl font-semibold text-gray-100 mb-3 md:mb-4">Live Preview</h2>
          <div id="livePreviewContainer" class="w-full h-[560px] min-h-0 max-h-none rounded-xl overflow-y-auto overflow-x-hidden overscroll-contain shadow-lg bg-gray-800 pointer-events-auto border border-gray-600/50"></div>
          <p class="text-xs text-center text-gray-500 mt-2 italic">Matches the public view exactly</p>
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

function renderEditorGreeting(profileData, lastEditMessage) {
  const rawName = (profileData.name || '').trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : 'there';
  const socialLinks = profileData.socialLinks || [];
  const remainingLinks = Math.max(0, CONFIG.maxSocialLinks - socialLinks.length);
  const prompts = [
    'Got something new to add? Your card is ready for its next little upgrade.',
    remainingLinks > 0
      ? `You still have room for ${remainingLinks} more ${remainingLinks === 1 ? 'link' : 'links'} to share.`
      : 'Your links are packed in. Give them a quick check and keep the good stuff visible.',
    !profileData.phone
      ? 'People cannot reach you by phone yet. Add a number if you want your card to do more talking.'
      : 'Your contact details are in place. Now make the card feel unmistakably yours.',
    !profileData.profilePic
      ? 'A profile photo would make this card feel much more like you.'
      : 'Your profile photo is doing the introductions. Try a fresh color mood if you feel like it.',
    !profileData.tagline
      ? 'Give visitors one sharp line about you. A good tagline does a lot of work.'
      : 'Want to spice up the colors? Your style controls are waiting right below.',
    !profileData.link
      ? 'Your public handle is still open. Set it in Settings when you are ready to share your card.'
      : 'Your public profile is ready to share whenever you are.',
    'Small edits add up: one better link, one clearer line, one color that feels right.'
  ];

  return {
    name: escapeHtml(firstName),
    message: escapeHtml(prompts[Math.floor(Math.random() * prompts.length)]),
    lastEditMessage: escapeHtml(lastEditMessage)
  };
}

function renderPersonalInfoSection(profileData) {
  const taglineLength = profileData.tagline?.length || 0;

  return `
    <h2 class="text-lg md:text-xl font-semibold text-gray-100 mb-3 md:mb-4">Personal Information</h2>
    <div class="space-y-3 md:space-y-4">
      <div>
        <label for="nameInput" class="block text-xs md:text-sm text-gray-300 mb-1">Name *</label>
        <input id="nameInput" type="text" name="name" value="${escapeHtml(profileData.name) || ''}" maxlength="120" required class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="taglineInput" class="block text-xs md:text-sm text-gray-300 mb-1">Tagline</label>
        <input id="taglineInput" type="text" name="tagline" value="${escapeHtml(profileData.tagline) || ''}" maxlength="120" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
        <p class="text-xs text-gray-400 mt-1 text-right"><span id="taglineCounter">${120 - taglineLength}</span>/120 characters left</p>
      </div>
      <div>
        <label for="phoneInput" class="block text-xs md:text-sm text-gray-300 mb-1">Phone</label>
        <input id="phoneInput" type="tel" name="phone" value="${escapeHtml(profileData.phone) || ''}" maxlength="80" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
        <p class="text-xs text-gray-400 mt-1">Format: +123 456 7890</p>
      </div>
      <div>
        <label for="addressInput" class="block text-xs md:text-sm text-gray-300 mb-1">Address</label>
        <textarea id="addressInput" name="address" rows="2" maxlength="500" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors resize-none">${escapeHtml(profileData.address) || ''}</textarea>
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

  // Theme comes from the url('...')/theme style string.
  let currentTheme = 'dark';
  if (styleConfig.type === 'image' && styleConfig.theme) {
    currentTheme = styleConfig.theme;
  } else if (typeof profileData.style === 'string' && /\/light\s*$/i.test(profileData.style)) {
    currentTheme = 'light';
  }

  const bgImageUrl = styleConfig.imageUrl || '';

  return `
    <h2 class="text-lg md:text-xl font-semibold text-gray-100 mb-3 md:mb-4">Profile Style</h2>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div>
        <label for="backgroundType" class="block text-xs md:text-sm text-gray-300 mb-1">Background Type</label>
        <select id="backgroundType" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
          <option value="gradient" ${gradientEnabled ? 'selected' : ''}>Gradient</option>
          <option value="image" ${!gradientEnabled ? 'selected' : ''}>Image URL</option>
        </select>
      </div>
      <div id="gradientDirectionGroup" class="${gradientEnabled ? '' : 'hidden'}">
        <label for="gradientDirection" class="block text-xs md:text-sm text-gray-300 mb-1">Gradient Direction</label>
        <select id="gradientDirection" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
          ${renderGradientDirectionOptions(direction)}
        </select>
      </div>
    </div>

    <div id="gradientInputsGroup" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 ${gradientEnabled ? '' : 'hidden'}">
      <div>
        <label for="gradientColor1" class="block text-xs md:text-sm text-gray-300 mb-1">Color 1</label>
        <input id="gradientColor1" type="color" value="${escapeHtml(color1)}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor2" class="block text-xs md:text-sm text-gray-300 mb-1">Color 2</label>
        <input id="gradientColor2" type="color" value="${escapeHtml(color2)}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
      <div>
        <label for="gradientColor3" class="block text-xs md:text-sm text-gray-300 mb-1">Color 3</label>
        <input id="gradientColor3" type="color" value="${escapeHtml(color3)}" class="h-11 w-full bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
      </div>
    </div>

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

    <div id="imageInputsGroup" class="mb-4 ${gradientEnabled ? 'hidden' : ''}">
      <label for="backgroundImageUrl" class="block text-xs md:text-sm text-gray-300 mb-1">Background Image</label>
      <div class="flex flex-wrap items-center gap-2">
        <input id="backgroundImageUrl" type="url" value="${escapeHtml(bgImageUrl)}" placeholder="https://example.com/background.jpg" class="flex-1 min-w-0 px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors">
        <input type="file" id="bgImageInput" accept="image/*" class="hidden">
        <button type="button" id="uploadBgBtn" class="px-3 py-2 bg-gray-700 rounded border border-gray-600 hover:border-blue-500 text-sm transition-colors">
          <i class="fas fa-upload"></i> Upload
        </button>
      </div>
      <p class="text-xs text-gray-400 mt-1">Paste a URL or upload an image (max 2MB, JPG/PNG/WEBP).</p>
      <span id="bgImageStatus" class="text-xs text-gray-400 block mt-1">${bgImageUrl ? '✅ Background image set' : ''}</span>

      <div class="mt-3 flex items-center gap-4">
        <label class="text-xs md:text-sm text-gray-300">Card Theme:</label>
        <select id="cardTheme" class="px-3 py-1.5 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none transition-colors text-sm">
          <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark Glass</option>
          <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light Glass</option>
        </select>
      </div>
    </div>
  `;
}

function renderSocialLinksSection(profileData) {
  const socialLinks = profileData.socialLinks || [];
  const remainingLinks = CONFIG.maxSocialLinks - socialLinks.length;

  return `
    <div class="space-y-3 md:space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg md:text-xl font-semibold text-gray-100">Social Links</h2>
        <button type="button" id="addSocialLink" class="text-xs md:text-sm text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"><i class="fas fa-plus"></i> Add</button>
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

function updateLivePreview() {
  const container = document.getElementById('livePreviewContainer');
  if (!container) return;

  const name = document.getElementById('nameInput')?.value || '';
  const tagline = document.getElementById('taglineInput')?.value || '';
  const profilePic = document.getElementById('profilePicUrl')?.value || '';

  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link);

  const { css, theme } = readStyleFromForm();

  container.innerHTML = buildPublicPreviewHtml({
    name, tagline, profilePic, socialLinks,
    background: css,
    cardTheme: theme
  });
}

// ═══════════════════════════════════════════════════════════════
// FORM → STYLE READERS
// ═══════════════════════════════════════════════════════════════

/**
 * Reads the form and returns { style, theme }.
 *   - Gradient mode stores the gradient in Style.
 *   - Image mode stores url('...')/theme in Style.
 */
function readStyleFromForm() {
  const typeInput = document.getElementById('backgroundType');
  const cardThemeSelect = document.getElementById('cardTheme');

  if (!typeInput) {
    return { style: '', css: '', theme: 'dark' };
  }

  if (typeInput.value === 'image') {
    const manualUrlInput = document.getElementById('backgroundImageUrl');
    const url = (manualUrlInput?.value || '').trim();
    const theme = cardThemeSelect?.value === 'light' ? 'light' : 'dark';

    if (!url) {
      const fallback = 'linear-gradient(135deg, rgb(45, 55, 72), rgb(17, 24, 39))';
      return { style: fallback, css: fallback, theme };
    }

    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (_) { throw new Error('Enter a valid background image URL'); }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Background image URL must use HTTP or HTTPS');
    if (/\s/.test(url) || parsedUrl.username || parsedUrl.password) throw new Error('Background image URL must not contain spaces or login credentials');

    const escaped = url.replace(/'/g, "\\'");
    return { style: `url('${escaped}')/${theme}`, css: `url('${escaped}')`, theme };
  }

  const directionInput = document.getElementById('gradientDirection');
  const color1Input = document.getElementById('gradientColor1');
  const color2Input = document.getElementById('gradientColor2');
  const color3Input = document.getElementById('gradientColor3');
  const direction = directionInput?.value || '135deg';
  const color1 = color1Input?.value || '#7c3aed';
  const color2 = color2Input?.value || '#1d4ed8';
  const color3 = color3Input?.value || '#0f172a';
  const css = `linear-gradient(${direction}, ${color1}, ${color2}, ${color3})`;

  return { style: css, css, theme: 'dark' };
}

function parseStyleValue(styleValue) {
  if (!styleValue || typeof styleValue !== 'string') return { type: 'gradient' };

  if (/^url\(/i.test(styleValue.trim())) {
    const match = styleValue.match(/url\(["']?(.*?)["']?\)/i);
    const themeMatch = styleValue.match(/\/(dark|light)\s*$/i);
    return {
      type: 'image',
      imageUrl: match?.[1] || '',
      theme: themeMatch && /^light$/i.test(themeMatch[1]) ? 'light' : 'dark'
    };
  }

  const gradientMatch = styleValue.match(/linear-gradient\(([\s\S]*)\)/i);
  if (gradientMatch) {
    const parts = splitCssArguments_(gradientMatch[1]);
    if (parts.length >= 3) {
      const colors = parts.slice(1).map(color => normalizeColorInput_(color));
      return {
        type: 'gradient',
        direction: parts[0].trim(),
        color1: colors[0],
        color2: colors[1] || colors[0],
        color3: colors[2] || colors[colors.length - 1]
      };
    }
  }

  if (styles[styleValue]?.background) {
    return parseStyleValue(styles[styleValue].background.replace(/^background:/i, '').trim());
  }

  return { type: 'gradient' };
}

function renderGradientDirectionOptions(selectedDirection) {
  const directions = ['45deg', '90deg', '135deg', '145deg', '180deg', '225deg'];
  if (selectedDirection && !directions.includes(selectedDirection) && /^(?:\d{1,3}deg|to (?:left|right|top|bottom)(?: (?:left|right|top|bottom))?)$/i.test(selectedDirection)) {
    directions.push(selectedDirection);
  }
  return directions.map((direction) => `<option value="${direction}" ${direction === selectedDirection ? 'selected' : ''}>${direction}</option>`).join('');
}

function splitCssArguments_(value) {
  const result = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') depth = Math.max(0, depth - 1);
    else if (value[i] === ',' && depth === 0) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result;
}

function normalizeColorInput_(value) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return '#000000';
  context.fillStyle = '#000000';
  context.fillStyle = value.trim();
  const color = context.fillStyle;
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (/^#[\da-f]{3}$/i.test(color)) return '#' + color.slice(1).split('').map(char => char + char).join('');
  const rgb = color.match(/^rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) return '#' + rgb.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

// ═══════════════════════════════════════════════════════════════
// QR CODE SECTION
// ═══════════════════════════════════════════════════════════════

export function renderSettingsSection() {
  const profileLink = state.profileData?.link?.trim() || '';
  const publicProfileUrl = profileLink
    ? `https://card.tccards.tn/@${profileLink.replace(/^@/, '')}`
    : '';
  const sessionExpiry = state.currentUser?.expiry
    ? new Date(Number(state.currentUser.expiry)).toLocaleString()
    : 'Unknown';
  const autoSaveEnabled = localStorage.getItem(AUTO_SAVE_STORAGE_KEY) === 'true';
  const appTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';

  DOM.profileEditor.innerHTML = `
    <div class="dashboard-view-shell space-y-6">
      <div>
        <p class="text-xs uppercase tracking-wide text-gray-500">Preferences</p>
        <h2 class="text-2xl font-bold text-gray-100 mt-1">Settings</h2>
        <p class="text-sm text-gray-400 mt-1">Manage your editor preferences and account access.</p>
      </div>
      <section class="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
        <div><h3 class="text-lg font-semibold text-gray-100">Editor appearance</h3><p class="text-sm text-gray-400">Choose the look of this editor. This does not change your public card style.</p></div>
        <label for="settingsAppTheme" class="block text-sm text-gray-300">Theme</label>
        <select id="settingsAppTheme" class="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors">
          <option value="dark" ${appTheme === 'dark' ? 'selected' : ''}>Dark</option>
          <option value="light" ${appTheme === 'light' ? 'selected' : ''}>Light</option>
        </select>
      </section>
      <section class="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
        <div><h3 class="text-lg font-semibold text-gray-100">Editor preferences</h3><p class="text-sm text-gray-400">These preferences are saved on this device.</p></div>
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <span><span class="block text-sm text-gray-200">Auto-save changes</span><span class="block text-xs text-gray-500 mt-1">Save profile edits automatically after a short pause.</span></span>
          <input id="settingsAutoSave" type="checkbox" ${autoSaveEnabled ? 'checked' : ''} class="w-5 h-5 accent-purple-600">
        </label>
      </section>
      <section class="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
        <div><h3 class="text-lg font-semibold text-gray-100">Public profile</h3><p class="text-sm text-gray-400">The address people use to view your digital card.</p></div>
        <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input type="text" readonly value="${escapeHtml(publicProfileUrl || 'No profile link available')}" class="flex-1 min-w-0 px-3 py-2 bg-gray-900 rounded border border-gray-700 text-sm text-gray-300">
          ${publicProfileUrl ? `<a href="${escapeHtml(publicProfileUrl)}" target="_blank" class="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-300 hover:text-blue-200 transition-colors"><i class="fas fa-external-link-alt"></i> Open profile</a>` : ''}
        </div>
      </section>
      <section class="rounded-xl border border-gray-700 bg-gray-800/60 p-5 space-y-4">
        <div><h3 class="text-lg font-semibold text-gray-100">Session</h3><p class="text-sm text-gray-400">Your current editor session information.</p></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><p class="text-xs text-gray-500">Signed in as</p><p class="text-gray-200 break-all mt-1">${escapeHtml(state.currentUser?.email || 'Unknown')}</p></div>
          <div><p class="text-xs text-gray-500">Session expires</p><p class="text-gray-200 mt-1">${escapeHtml(sessionExpiry)}</p></div>
        </div>
        <button id="settingsLogoutBtn" type="button" class="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"><i class="fas fa-sign-out-alt"></i> Sign out</button>
      </section>
      <section class="border-t border-gray-800 pt-5"><a href="https://termination.tccards.tn/" target="_blank" class="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"><i class="fas fa-trash-alt"></i> Delete account</a></section>
    </div>
  `;

  document.getElementById('settingsAutoSave')?.addEventListener('change', (event) => {
    localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(event.target.checked));
  });
  document.getElementById('settingsAppTheme')?.addEventListener('change', (event) => {
    const theme = event.target.value === 'light' ? 'light' : 'dark';
    localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    applyAppTheme(theme);
  });
  document.getElementById('settingsLogoutBtn')?.addEventListener('click', logout);
}

function applyAppTheme(theme) {
  document.body.classList.toggle('app-theme-light', theme === 'light');
  document.body.classList.toggle('app-theme-dark', theme !== 'light');
}

export function renderQRCodeSection() {
  const profileId = state.profileData?.id?.toString().trim() || '';
  const profileLink = state.profileData?.link?.trim() || '';
  const qrData = profileId
    ? `https://card.tccards.tn/id_${profileId}`
    : (profileLink ? `https://card.tccards.tn/@${profileLink.replace(/^@/, '')}` : '');

  DOM.profileEditor.innerHTML = `
    <div class="dashboard-view-shell qr-studio flex flex-col lg:flex-row gap-8">
      <div class="flex-1 space-y-6 min-w-0">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-100">QR Code Studio</h2>
            <p class="text-sm text-gray-400 mt-1">Generate a high-quality QR code linking to your live profile.</p>
          </div>
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
          <div class="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 border border-dashed border-gray-600 hover:border-purple-500 transition-colors cursor-pointer" id="imageUploadArea">
            <div id="imagePreviewContainer" class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden shrink-0 border border-gray-600"><span class="text-xs text-gray-500"><i class="fas fa-image"></i></span></div>
            <div class="flex-1 min-w-0"><p class="text-sm text-gray-300 font-medium">Upload your logo</p><p class="text-xs text-gray-500 truncate" id="imageFileName">PNG, JPG recommended (max 2MB)</p></div>
            <input type="file" id="qrLogoInput" accept="image/*" class="hidden">
          </div>
        </div>
        <div class="flex flex-wrap gap-3 pt-2">
          <button id="downloadQrBtn" class="flex-1 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-5 rounded-lg transition-colors font-medium"><i class="fas fa-download"></i> Download PNG</button>
          <button id="refreshQrBtn" type="button" class="inline-flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-5 rounded-lg transition-colors"><i class="fas fa-rotate"></i> Reset</button>
        </div>
      </div>
      <div class="qr-preview-panel w-full lg:w-[450px] shrink-0 flex flex-col items-center justify-start rounded-xl border border-gray-700 bg-gray-800/70 p-6">
        <div id="qrCodeContainer" class="w-full flex justify-center bg-white rounded-xl p-4 shadow-lg"></div>
        <div class="mt-4 text-center"><p class="text-xs text-gray-400">Scan this code to open your profile directly</p></div>
      </div>
    </div>
  `;
  setupQRCodeListeners(qrData);
}

function setupQRCodeListeners(url) {
  const container = document.getElementById('qrCodeContainer');
  const foregroundInput = document.getElementById('qrForeground');
  const foregroundText = document.getElementById('qrForegroundText');
  const backgroundInput = document.getElementById('qrBackground');
  const backgroundText = document.getElementById('qrBackgroundText');
  const dotStyleInput = document.getElementById('qrDotStyle');
  const cornerStyleInput = document.getElementById('qrCornerStyle');
  const logoInput = document.getElementById('qrLogoInput');
  const logoPreviewContainer = document.getElementById('imagePreviewContainer');
  const logoFileName = document.getElementById('imageFileName');
  const refreshBtn = document.getElementById('refreshQrBtn');
  const downloadBtn = document.getElementById('downloadQrBtn');
  const presetsContainer = document.getElementById('presetsContainer');

  if (!container || !downloadBtn) return;
  const QRStyling = window.QRCodeStyling;
  if (!QRStyling) { container.innerHTML = `<p class="text-red-400 text-sm">QR library missing. Please include qrcode-styling.</p>`; return; }

  const getQrTarget = () => url || '';
  const getOptions = () => ({
    width: 320, height: 320, data: getQrTarget(), image: uploadedimageUrl || undefined, margin: 10,
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
    if (file.size > 2 * 1024 * 1024) { showAlert('error', 'File Too Large', 'Image must be smaller than 2MB.'); logoInput.value = ''; return; }
    if (uploadedimageUrl) { URL.revokeObjectURL(uploadedimageUrl); uploadedimageUrl = null; }
    uploadedimageUrl = URL.createObjectURL(file);
    logoPreviewContainer.innerHTML = `<img src="${uploadedimageUrl}" class="w-full h-full object-cover">`;
    logoFileName.textContent = file.name;
    renderQR();
  });

  document.getElementById('imageUploadArea')?.addEventListener('click', () => { logoInput?.click(); });
  const refresh = () => {
    if (uploadedimageUrl) { URL.revokeObjectURL(uploadedimageUrl); uploadedimageUrl = null; }
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

// ═══════════════════════════════════════════════════════════════
// ANALYTICS SECTION
// ═══════════════════════════════════════════════════════════════

export function renderAnalyticsSection() {
  DOM.profileEditor.innerHTML = `
    <div class="dashboard-view-shell analytics-upgrade-view">
      <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p class="text-xs uppercase tracking-wider text-blue-400 mb-1">Standard feature</p>
          <h2 class="text-2xl md:text-3xl font-bold text-gray-100">Understand your reach</h2>
          <p class="text-sm text-gray-400 mt-2 max-w-2xl">Analytics is ready when you are. Upgrade from Basic to see what your profile is doing in the real world.</p>
        </div>
        <span class="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-300">
          <i class="fas fa-lock" aria-hidden="true"></i> Basic plan
        </span>
      </div>
      <div class="analytics-upgrade-card rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 md:p-8 shadow-lg">
        <div class="flex flex-col md:flex-row md:items-center gap-6">
          <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300 text-2xl">
            <i class="fas fa-chart-line" aria-hidden="true"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-gray-100">Turn profile visits into useful decisions</h3>
            <p class="mt-2 text-sm leading-6 text-gray-300">Standard shows which links people click, how often your profile is visited, and which contact actions are working.</p>
          </div>
          <a href="https://tccards.tn" target="_blank" rel="noopener noreferrer" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Upgrade to Standard
          </a>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6" aria-label="Analytics preview">
        <div class="rounded-xl border border-gray-700/70 bg-gray-800/50 p-4">
          <i class="fas fa-eye text-blue-400" aria-hidden="true"></i>
          <p class="mt-3 text-sm font-medium text-gray-200">Profile visits</p>
          <p class="mt-1 text-xs text-gray-500">See when your card gets attention.</p>
        </div>
        <div class="rounded-xl border border-gray-700/70 bg-gray-800/50 p-4">
          <i class="fas fa-arrow-pointer text-emerald-400" aria-hidden="true"></i>
          <p class="mt-3 text-sm font-medium text-gray-200">Link clicks</p>
          <p class="mt-1 text-xs text-gray-500">Find out which links people use.</p>
        </div>
        <div class="rounded-xl border border-gray-700/70 bg-gray-800/50 p-4">
          <i class="fas fa-address-book text-amber-400" aria-hidden="true"></i>
          <p class="mt-3 text-sm font-medium text-gray-200">Contact actions</p>
          <p class="mt-1 text-xs text-gray-500">Measure saves and copied details.</p>
        </div>
      </div>
    </div>
  `;
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

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

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
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('beforeunload', handleBeforeUnload);
}

function setupFormEvents() {
  const form = document.getElementById('profileForm');
  form?.addEventListener('submit', handleSaveProfile);
  document.getElementById('cancelChangesBtn')?.addEventListener('click', cancelChanges);
  document.getElementById('uploadImageBtn')?.addEventListener('click', () => { document.getElementById('profilePicInput')?.click(); });
  document.getElementById('profilePicInput')?.addEventListener('change', handleProfilePicUpload);
  document.getElementById('uploadBgBtn')?.addEventListener('click', () => { document.getElementById('bgImageInput')?.click(); });
  document.getElementById('bgImageInput')?.addEventListener('change', handleBgImageUpload);
  document.getElementById('addSocialLink')?.addEventListener('click', addSocialLink);
  document.getElementById('socialLinksContainer')?.addEventListener('click', handleSocialLinkAction);
  document.getElementById('taglineInput')?.addEventListener('input', updateTaglineCounter);
  setupBackgroundStyleEvents();
}

async function cancelChanges() {
  if (!unsavedChanges) return;
  if (!(await promptUnsavedChanges())) return;

  unsavedChanges = false;
  renderProfileForm();
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
  const cardThemeInput = document.getElementById('cardTheme');

  const syncAll = () => {
    updateBackgroundInputsVisibility();
    updateLivePreview();
    markUnsavedChanges();
  };

  [typeInput, directionInput, color1Input, color2Input, color3Input, imageUrlInput, cardThemeInput].forEach((input) => {
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

  if (!typeInput || !gradientGroup || !imageGroup || !presetsContainer) return;

  const isGradient = typeInput.value !== 'image';

  gradientGroup.classList.toggle('hidden', !isGradient);
  imageGroup.classList.toggle('hidden', isGradient);
  presetsContainer.classList.toggle('hidden', !isGradient);
  if (directionGroup) { directionGroup.classList.toggle('hidden', !isGradient); }
}

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
            autoSaveBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    span.textContent = 'Auto-save: On';
    showSaveStatus('Auto-save enabled', 'text-blue-400');
    triggerAutoSave();
  } else {
            autoSaveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
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
    if (window.matchMedia('(max-width: 639px)').matches && statusDismissed) return;
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

async function handleBgImageUpload(event) {
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
    updateBgStatus('Uploading...', 'text-blue-400');
    const url = await uploadToCloudinary(file);
    const bgUrlInput = document.getElementById('backgroundImageUrl');
    if (bgUrlInput) bgUrlInput.value = url;
    const bgTypeSelect = document.getElementById('backgroundType');
    if (bgTypeSelect) bgTypeSelect.value = 'image';
    updateBackgroundInputsVisibility();
    updateBgStatus('✅ Uploaded successfully', 'text-green-400');
    markUnsavedChanges();
    updateLivePreview();
    triggerAutoSave();
  } catch (error) {
    console.error('Bg upload failed:', error);
    updateBgStatus('Upload failed', 'text-red-400');
    await showAlert('error', 'Upload Failed', 'Failed to upload background image. Please try again.');
  }
}

function updateProfilePicStatus(message, className) {
  const statusEl = document.getElementById('profilePicStatus');
  statusEl.textContent = message;
  statusEl.className = `text-sm truncate max-w-xs ${className}`;
}

function updateBgStatus(message, className) {
  const statusEl = document.getElementById('bgImageStatus');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `text-xs block mt-1 ${className}`;
  }
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
    showAlert('info', 'Maximum Reached', `You can add up to ${CONFIG.maxSocialLinks} social links.`, { timer: 3000, showConfirmButton: false });
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
  container.appendChild(div);
  updateRemainingLinks();
  markUnsavedChanges();
}

function handleSocialLinkAction(event) {
  const removeButton = event.target.closest('.remove-social-link');
  if (!removeButton) return;

  const linkItem = removeButton.closest('.social-link-item');
  if (!linkItem) return;

  linkItem.remove();
  updateRemainingLinks();
  updateLivePreview();
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
  changeVersion++;
  unsavedChanges = true;
  document.getElementById('cancelChangesBtn')?.classList.remove('hidden');
  showSaveStatus('Unsaved changes', 'text-yellow-400');
  triggerAutoSave();
}

// ═══════════════════════════════════════════════════════════════
// SAVE (POST so large payloads reach the backend)
// ═══════════════════════════════════════════════════════════════
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
    nameInput.focus();
    return;
  }

  const profilePicUrl = document.getElementById('profilePicUrl').value.trim();
  let style;
  try {
    style = readStyleFromForm().style;
  } catch (error) {
    await showAlert('error', 'Invalid Background URL', error.message);
    return;
  }

  const socialLinks = Array.from(document.querySelectorAll('input[name="socialLinks"]'))
    .map(input => input.value.trim())
    .filter(link => link && isValidUrl(link));

  const updateData = {
    name:            nameInput.value.trim(),
    tagline:         document.getElementById('taglineInput').value.trim(),
    phone:           document.getElementById('phoneInput').value.trim(),
    address:         document.getElementById('addressInput').value.trim(),
    profilePic:      profilePicUrl,
    socialLinks:     socialLinks,
    style
  };

  const previousProfilePic = state.profileData?.profilePic      || '';
  const versionAtStart = changeVersion;

  try {
    isSaving = true;
    submitBtn.disabled = true;
    saveSpinner.classList.remove('hidden');
    showSaveStatus(isAutoSaveRun ? 'Auto-saving changes...' : 'Saving changes...', 'text-blue-400');

    // 1) Verify session
    const verifyResponse = await fetch(CONFIG.googleEditUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'verify_session', token: state.currentUser.sessionToken })
    });
    if (!verifyResponse.ok) throw new Error(`Session check failed (${verifyResponse.status})`);
    const sessionData = await verifyResponse.json();
    if (!sessionData.valid) throw new Error('SESSION_EXPIRED');

    // 2) POST the payload
    const payload = {
      action: 'update_profile',
      token: state.currentUser.sessionToken,
      email: state.currentUser.email,
      previousProfilePic,
      data: updateData
    };

    const updateResponse = await fetch(CONFIG.googleEditUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!updateResponse.ok) throw new Error(`Save request failed (${updateResponse.status})`);
    const result = await updateResponse.json();
    if (result.status !== 'success') throw new Error(result.message || 'Save failed');

    // 3) Update local state
    unsavedChanges = changeVersion !== versionAtStart;
    document.getElementById('cancelChangesBtn')?.classList.toggle('hidden', !unsavedChanges);
    lastSavedAt = Date.now();
    state.profileData = { ...state.profileData, ...updateData };
    localStorage.setItem('profileEditorProfile', JSON.stringify(state.profileData));
    
    const saveMessage = unsavedChanges
      ? 'Saved. Newer edits still need saving.'
      : isAutoSaveRun
        ? 'Auto-saved. Already-open profiles may update within 5 minutes; newly opened profiles update immediately.'
        : 'Saved successfully. Already-open profiles may update within 5 minutes; newly opened profiles update immediately.';
    showSaveStatus(saveMessage, unsavedChanges ? 'text-yellow-400' : 'text-green-400');

    updateSidebar();
    updatePublicProfileLink();

  } catch (error) {
    console.error('❌ Save error:', error);
    if (error.message.includes('SESSION_EXPIRED')) {
      await showAlert('error', 'Session Expired', 'Please log in again');
      logout();
      return;
    }
    if (!isAutoSaveRun) {
      await showAlert('error', 'Save Failed', error.message || 'Failed to save changes. Please try again.');
    }
    showSaveStatus('Failed to save changes', 'text-red-400');
  } finally {
    isSaving = false;
    submitBtn.disabled = false;
    saveSpinner.classList.add('hidden');
    if (unsavedChanges && autoSaveEnabled) triggerAutoSave();
  }
}

function showSaveStatus(message, className = '') {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;
  const isMobile = window.matchMedia('(max-width: 639px)').matches;
  statusDismissed = false;
  if (statusEl.timeoutId) clearTimeout(statusEl.timeoutId);
  const statusIcon = className.includes('green') ? 'fa-circle-check' : className.includes('blue') ? 'fa-rotate' : className.includes('yellow') ? 'fa-triangle-exclamation' : className.includes('red') ? 'fa-circle-xmark' : 'fa-circle-info';
  statusEl.innerHTML = `<div class="flex items-center justify-between gap-3 transition-all duration-300 w-full"><span class="inline-flex items-center gap-2"><i class="fa-solid ${statusIcon}" aria-hidden="true"></i><span>${message}</span></span><button type="button" class="save-status-close text-gray-400 hover:text-white" aria-label="Close save status"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>`;
  statusEl.querySelector('.save-status-close')?.addEventListener('click', () => {
    clearTimeout(statusEl.mobileTimeoutId);
    clearTimeout(statusEl.timeoutId);
    statusDismissed = true;
    statusEl.classList.remove('is-visible');
    statusEl.classList.add('is-dismissed');
  });
  const toneClass = className.includes('green') ? 'bg-green-900/20 border-green-600/30' : className.includes('blue') ? 'bg-blue-900/20 border-blue-600/30' : className.includes('yellow') ? 'bg-yellow-900/20 border-yellow-600/30' : className.includes('red') ? 'bg-red-900/20 border-red-600/30' : 'bg-gray-900/40 border-gray-700';
  statusEl.className = `save-status-toast text-sm min-h-[44px] px-3 py-2 rounded-lg border transition-all duration-300 ${className} ${toneClass}`;
  if (!isMobile && (className.includes('green') || className.includes('blue'))) {
    statusEl.timeoutId = setTimeout(() => {
      if (unsavedChanges) { showSaveStatus('Unsaved changes', 'text-yellow-400'); return; }
      if (lastSavedAt) { showSaveStatus(`Last saved ${formatRelativeTime(lastSavedAt)}`, 'text-green-400'); return; }
      statusEl.innerHTML = '';
      statusEl.className = 'save-status-toast text-sm min-h-[44px] px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/40 text-gray-300';
    },1000);
  }

  if (isMobile) {
    statusEl.classList.remove('is-dismissed');
    statusEl.classList.add('is-visible');
    clearTimeout(statusEl.mobileTimeoutId);
    statusEl.mobileTimeoutId = setTimeout(() => {
      statusEl.classList.remove('is-visible');
      statusEl.classList.add('is-dismissed');
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
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}
