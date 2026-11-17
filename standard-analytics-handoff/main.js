import { renderCardHtml, parseStyleParams, backgroundLayerHtml } from './renderer.js';

const CONFIG = {
  defaultBg: 'url(https://www.tccards.tn/Assets/background.png) center fixed',
  defaultProfilePic: 'https://www.tccards.tn/Assets/default.png',
  databases: {
    id: 'NOT-YET-DEPLOYED',
    plan: 'standard',
  },
  analyticsEndpoint: 'https://script.google.com/macros/s/YOUR_STANDARD_CODE_GS_DEPLOYMENT_ID/exec',
  styles: {
    corporateGradient: { background: 'linear-gradient(145deg, rgb(9, 9, 11), rgb(24, 24, 27), rgb(9, 9, 11))' },
    oceanGradient: { background: 'linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23))' },
  },
};

const RANDOM_PROFILE_LINKS = [
  'Ali','SkanDev','yassine','mehdigh','Oussemabennour','Paralingua','Keeto','houssem',
  'Emna','Omar','Mohamed','Hamza','Oussema','the_cyber_corner','Seddik','Nour','Ameni','Chiheb'
];

let currentTheme = 'dark';
let currentAccent = '';
let activeAnalyticsId = '';

function trackAnalyticsEvent(eventType, details = {}) {
  if (!activeAnalyticsId ||
      CONFIG.analyticsEndpoint.includes('YOUR_STANDARD_CODE_GS_DEPLOYMENT_ID')) return;

  const body = JSON.stringify({
    action: 'trackAnalytics',
    analyticsId: activeAnalyticsId,
    eventType,
    details
  });

  try {
    const beaconBody = new Blob([body], { type: 'text/plain;charset=UTF-8' });
    if (navigator.sendBeacon?.(CONFIG.analyticsEndpoint, beaconBody)) return;
  } catch (_) {}

  fetch(CONFIG.analyticsEndpoint, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body,
    keepalive: true
  }).catch(() => {});
}

document.addEventListener('DOMContentLoaded', function () {
  setupProfileImageLightbox();

  const formatDetection = document.createElement('meta');
  formatDetection.name = 'format-detection';
  formatDetection.content = 'telephone=no, email=no, address=no';
  document.head.appendChild(formatDetection);

  document.body.style.background = CONFIG.defaultBg;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backdropFilter = 'blur(5px)';

  let hash = window.location.hash.substring(1);
  if (!hash) { showError('No profile link provided'); return; }

  const normalizedHash = hash.toLowerCase();
  if (normalizedHash === 'random' || normalizedHash === 'random-profile') {
    hash = RANDOM_PROFILE_LINKS[Math.floor(Math.random() * RANDOM_PROFILE_LINKS.length)];
    window.history.replaceState(null, null, `https://my.tccards.tn/@${hash}`);
  }

  const isIdLookup = hash.startsWith('id_');
  const identifier = isIdLookup ? hash.slice(3) : hash;
  const newUrl = isIdLookup
    ? `https://my.tccards.tn/id_${identifier}`
    : `https://my.tccards.tn/@${hash}`;
  window.history.replaceState(null, null, newUrl);

  searchProfile(identifier, isIdLookup);
});

function setupProfileImageLightbox() {
  document.addEventListener('click', (event) => {
    const image = event.target.closest('.profile-image-trigger');
    if (image) {
      event.preventDefault();
      openProfileImage(image);
      return;
    }

    const lightbox = document.getElementById('profileImageLightbox');
    if (lightbox && event.target === lightbox) closeProfileImage();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProfileImage();
  });
}

function openProfileImage(sourceImage) {
  let lightbox = document.getElementById('profileImageLightbox');

  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'profileImageLightbox';
    lightbox.className = 'profile-image-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Expanded profile image');
    lightbox.innerHTML = `
      <button type="button" class="profile-image-lightbox-close" aria-label="Close image">X</button>
      <img class="profile-image-lightbox-image" alt="">
    `;
    lightbox.querySelector('.profile-image-lightbox-close').addEventListener('click', closeProfileImage);
    document.body.appendChild(lightbox);
  }

  const expandedImage = lightbox.querySelector('.profile-image-lightbox-image');
  const sourceStyle = getComputedStyle(sourceImage);
  const sourceBounds = sourceImage.getBoundingClientRect();
  const isCircle = sourceStyle.borderRadius === '50%';

  expandedImage.src = sourceImage.currentSrc || sourceImage.src;
  expandedImage.alt = sourceImage.alt || 'Expanded profile image';
  expandedImage.style.borderRadius = sourceStyle.borderRadius;
  expandedImage.style.aspectRatio = isCircle || !sourceBounds.height
    ? '1 / 1'
    : `${sourceBounds.width} / ${sourceBounds.height}`;
  expandedImage.classList.toggle('is-circle', isCircle);

  lightbox.hidden = false;
  document.body.classList.add('profile-image-lightbox-open');
  requestAnimationFrame(() => lightbox.classList.add('is-open'));
  lightbox.querySelector('.profile-image-lightbox-close').focus();
}

function closeProfileImage() {
  const lightbox = document.getElementById('profileImageLightbox');
  if (!lightbox || lightbox.hidden) return;

  lightbox.classList.remove('is-open');
  document.body.classList.remove('profile-image-lightbox-open');
  setTimeout(() => { lightbox.hidden = true; }, 180);
}

async function searchProfile(identifier, isIdLookup) {
  try {
    const param = isIdLookup ? 'id' : 'link';
    const url = `https://script.google.com/macros/s/${CONFIG.databases.id}/exec?${param}=${encodeURIComponent(identifier)}`;
    const response = await fetchWithTimeout(url, { timeout: 5000 });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data?.status === 'error') {
      showError('Profile not found');
      window.location.href = '/404.html';
      return;
    }
    if (data && typeof data === 'object') {
      handleProfileData(data, undefined, isIdLookup);
    } else {
      showError('Invalid profile data');
    }
  } catch (error) {
    console.error('Profile search error:', error);
    showError('Failed to load profile');
  }
}

async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 18000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function fieldKeyMatches(left, right) {
  const a = String(left).replace(/[^a-z0-9]/gi, '');
  const b = String(right).replace(/[^a-z0-9]/gi, '');
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    let ac = a.charCodeAt(i), bc = b.charCodeAt(i);
    if (ac >= 65 && ac <= 90) ac += 32;
    if (bc >= 65 && bc <= 90) bc += 32;
    if (ac !== bc) return false;
  }
  return true;
}

function getField(data, ...candidates) {
  if (!data || typeof data !== 'object') return '';
  for (const candidate of candidates) {
    const key = Object.keys(data).find(name => fieldKeyMatches(name, candidate));
    if (key !== undefined && data[key] !== undefined && data[key] !== null) return data[key];
  }
  return '';
}

/* ── Background resolver now returns template + accent ───── */
function resolveBackground(selectedStyle) {
  const params = parseStyleParams(selectedStyle);
  const { base, template, accent } = params;
  const extra = { cardBlur: params.cardBlur, bgBlur: params.bgBlur, cardOpacity: params.cardOpacity };
  const styleStr = base;

  if (!styleStr) {
    return { background: CONFIG.defaultBg, theme: 'default', isImage: true, template, accent, ...extra };
  }

  let theme = 'dark';
  const themeMatch = styleStr.match(/\/(dark|light)\s*$/i);
  if (themeMatch) theme = /^light$/i.test(themeMatch[1]) ? 'light' : 'dark';

  if (/^url\(/i.test(styleStr)) {
    const urlMatch = styleStr.match(/url\(["']?(.*?)["']?\)/i);
    const url = urlMatch?.[1] || '';
    if (url && /^https?:\/\//i.test(url)) {
      return { background: `url("${url}")`, theme, isImage: true, template, accent, ...extra };
    }
    return { background: CONFIG.defaultBg, theme: 'default', isImage: true, template, accent, ...extra };
  }

  if (/linear-gradient/i.test(styleStr)) {
    const gradient = themeMatch ? styleStr.slice(0, themeMatch.index).trim() : styleStr;
    return { background: gradient, theme, isImage: false, template, accent, ...extra };
  }

  return { background: CONFIG.defaultBg, theme: 'default', isImage: true, template, accent, ...extra };
}

function getPopupTheme() {
  const accent = currentAccent || (currentTheme === 'light' ? '#2563eb' : '#3b82f6');
  const accentText = getReadableAccentText(accent);

  if (currentTheme === 'light') {
    return {
      background: '#f1f5f9',
      color: '#0f172a',
      toastBg: '#e2e8f0',
      toastColor: '#0f172a',
      accent,
      accentText,
      isLight: true,
    };
  }
  if (currentTheme === 'default') {
    return {
      background: '#0f172a',
      color: '#ffffff',
      toastBg: '#0b1220',
      toastColor: '#ffffff',
      accent,
      accentText,
      isLight: false,
    };
  }
  return {
    background: '#111827',
    color: '#ffffff',
    toastBg: '#0b1220',
    toastColor: '#ffffff',
    accent,
    accentText,
    isLight: false,
  };
}

function getReadableAccentText(hex) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return '#ffffff';
  const value = match[1].length === 3
    ? match[1].split('').map((part) => part + part).join('')
    : match[1];
  const [red, green, blue] = [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 160 ? '#111827' : '#ffffff';
}

function handleProfileData(data, plan, isIdView = false) {
  const loader = document.querySelector('.loader');
  if (loader) {
    loader.style.transition = 'opacity 0.5s ease';
    loader.style.opacity = '0';
    setTimeout(() => { loader.style.display = 'none'; }, 500);
  }

  data = data.data || data;
  plan = plan || 'free';

  if (!data || typeof data !== 'object') { showError('Invalid profile data received'); return; }
  if (data.status === 'error') { showError(data?.message || 'Profile data could not be loaded'); return; }

  const resolvedName = getField(data, 'Name');
  if (!resolvedName) { showError('Invalid profile data: Name is required'); return; }

  const resolvedStatus = String(getField(data, 'Status') || '').trim();
  if (resolvedStatus && !/^active$/i.test(resolvedStatus)) { showError('This profile is currently inactive'); return; }

  try {
    const container = document.querySelector('.card-container');
    container.style.display = 'block';

    const profileData = {
      name:          getField(data, 'Name') || 'User',
      link:          getField(data, 'Link') || 'tccards',
      id:            getField(data, 'ID'),
      analyticsId:   getField(data, 'Analytics ID') || getField(data, 'ID'),
      tagline:       getField(data, 'Tagline'),
      profilePic:    getField(data, 'Profile Picture URL', 'Profile Picture', 'Profile Pic') || CONFIG.defaultProfilePic,
      socialLinks:   normalizeSocialLinks(getField(data, 'Social Links', 'SocialLinks')),
      email:         getField(data, 'Email') || '',
      phone:         getField(data, 'Phone') || '',
      address:       getField(data, 'Address') || '',
      selectedStyle: getField(data, 'Selected Style', 'Style') || '',
    };

    const shareUrl = isIdView
      ? `https://my.tccards.tn/id_${profileData.id}`
      : `https://my.tccards.tn/@${escapeHtml(profileData.link)}`;

    updateMetaTags(profileData, isIdView);

    const { background, theme, isImage, template, accent, cardBlur, bgBlur, cardOpacity } = resolveBackground(profileData.selectedStyle);

    currentTheme = theme;
    currentAccent = accent || '';
    document.body.dataset.theme = theme;
    document.body.style.background = background;
    document.body.style.backgroundSize = isImage ? 'cover' : 'auto';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';

    // Background blur is opt-in per profile (bb=). Unset keeps the legacy look untouched;
    // bb=0 turns the old body blur off; bb>0 blurs a dedicated layer so the card stays sharp.
    if (bgBlur !== null) {
      document.body.style.backdropFilter = '';
      document.getElementById('bgBlurLayer')?.remove();
      const layer = isImage ? backgroundLayerHtml(background, bgBlur, 'fixed') : '';
      if (layer) {
        document.documentElement.style.background = 'none';
        document.body.style.background = '#0b1020';
        document.body.insertAdjacentHTML('afterbegin', layer);
      }
    }

    container.innerHTML = renderCardHtml(profileData, {
      theme,
      template,
      accent,
      cardBlur,
      cardOpacity,
      interactive: true,
    });

    activeAnalyticsId = profileData.analyticsId;
    if (!container.dataset.analyticsBound) {
      container.dataset.analyticsBound = '1';
      container.addEventListener('click', event => {
        const anchor = event.target.closest('a[href]');
        if (!anchor || !container.contains(anchor)) return;

        const href = anchor.getAttribute('href') || '';
        if (/^mailto:/i.test(href)) {
          trackAnalyticsEvent('contact_email');
          return;
        }
        if (/^tel:/i.test(href)) {
          trackAnalyticsEvent('contact_phone');
          return;
        }
        if (/maps\.google|maps\.app/i.test(href)) {
          trackAnalyticsEvent('contact_location');
          return;
        }

        try {
          const url = new URL(anchor.href);
          if ((url.protocol === 'http:' || url.protocol === 'https:') &&
              url.hostname !== window.location.hostname) {
            trackAnalyticsEvent('link_click', { domain: url.hostname });
          }
        } catch (_) {}
      });
    }
    trackAnalyticsEvent('view');

    console.log('Profile loaded', { template: template || 'classic' });
  } catch (error) {
    console.error('Profile rendering error:', error);
    showError('Error displaying profile');
  }
}

function updateMetaTags(profileData, isIdView) {
  const profileUrl = isIdView
    ? `https://my.tccards.tn/id_${profileData.id}`
    : `https://my.tccards.tn/@${profileData.link}`;

  const title = `${profileData.name} | Total Connect NFC`;
  const description = profileData.tagline
    ? `${profileData.tagline} — View ${profileData.name}'s digital business card.`
    : `View and save ${profileData.name}'s digital business card, powered by Total Connect NFC.`;
  const image = profileData.profilePic || 'https://www.tccards.tn/Assets/150.png';

  document.title = title;

  const setMeta = (selector, attr, value) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const [attrName, attrValue] = selector.replace('meta[', '').replace(']', '').split('="');
      el.setAttribute(attrName.trim(), attrValue.replace(/"/g, ''));
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', 'content', description);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = profileUrl;

  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:image"]', 'content', image);
  setMeta('meta[property="og:url"]', 'content', profileUrl);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('meta[name="twitter:image"]', 'content', image);
}

function normalizeSocialLinks(links) {
  if (Array.isArray(links)) return links.map(l => String(l).trim()).filter(Boolean);
  if (typeof links !== 'string') return [];
  return links.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

/* ── vCard & contact (unchanged) ─────────────────────────── */
function generateVCard(contact) {
  const fullName = contact.name || 'Contact';
  const email = contact.email || '';
  const phone = contact.phone || '';
  const address = contact.address || '';
  let vcard = 'BEGIN:VCARD\nVERSION:3.0\n';
  vcard += `FN:${fullName}\nN:${fullName};;;\n`;
  if (email) vcard += `EMAIL:${email}\n`;
  if (phone) vcard += `TEL:${phone}\n`;
  if (address) vcard += `ADR:;;${address};;;\n`;
  vcard += 'END:VCARD';
  return vcard;
}

function downloadVCard(vcardString, filename = 'contact.vcf') {
  const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

async function shareVCardFile(vcardString, fileName) {
  if (navigator.share && navigator.canShare) {
    try {
      const blob = new Blob([vcardString], { type: 'text/vcard;charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/vcard' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return true;
      }
    } catch (err) { console.warn('Web Share failed, falling back to download:', err); }
  }
  return false;
}

async function copyContactDetails(contact) {
  const lines = [
    contact.name,
    contact.email && `Email: ${contact.email}`,
    contact.phone && `Phone: ${contact.phone}`,
    contact.address && `Address: ${contact.address}`,
  ].filter(Boolean);
  try { await navigator.clipboard.writeText(lines.join('\n')); return true; }
  catch { return false; }
}

async function showContactDetails(contact) {
  try {
    if (!contact || typeof contact !== 'object') throw new Error('Invalid contact data');
    const popup = getPopupTheme();
    const contactHtml = `
      <div class="contact-details" x-apple-data-detectors="false" style="--contact-accent:${popup.accent};--contact-accent-text:${popup.accentText};">
        <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        <div class="contact-detail-list" x-apple-data-detectors="false">
          ${contact.email ? `<div class="contact-detail-item"><i class="fas fa-envelope"></i><a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></div>` : ''}
          ${contact.phone ? `<div class="contact-detail-item"><i class="fas fa-phone"></i><a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a></div>` : ''}
          ${contact.address ? `<div class="contact-detail-item"><i class="fas fa-map-marker-alt"></i><a href="https://maps.google.com/?q=${encodeURIComponent(contact.address)}" target="_blank" rel="noopener">${escapeHtml(contact.address)}</a></div>` : ''}
        </div>
        <div class="contact-actions-row">
          <button class="contact-action-btn copy-btn" id="copyDetailsBtn"><i class="fas fa-copy"></i> Copy Details</button>
          <button class="contact-action-btn save-btn" id="saveContactBtn"><i class="fas fa-save"></i> Save Contact</button>
        </div>
      </div>`;
    await Swal.fire({
      title: 'Contact Details', html: contactHtml,
      background: popup.background, color: popup.color,
      showCloseButton: true, closeButtonHtml: '✕',
      showConfirmButton: false, showCancelButton: false, allowOutsideClick: false,
      customClass: { closeButton: 'swal-close-button-custom', popup: popup.isLight ? 'swal-theme-light' : 'swal-theme-dark' },
      didOpen: (modal) => {
        modal.querySelector('a[href^="mailto:"]')
          ?.addEventListener('click', () => trackAnalyticsEvent('contact_email'));
        modal.querySelector('a[href^="tel:"]')
          ?.addEventListener('click', () => trackAnalyticsEvent('contact_phone'));
        modal.querySelector('a[href*="maps.google.com"]')
          ?.addEventListener('click', () => trackAnalyticsEvent('contact_location'));

        modal.querySelector('#copyDetailsBtn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const copied = await copyContactDetails(contact);
          if (copied) trackAnalyticsEvent('copy_details');
          Swal.fire({
            icon: copied ? 'success' : 'error',
            title: copied ? 'Copied!' : 'Copy failed',
            text: copied ? undefined : 'Please allow clipboard access.',
            toast: true, position: 'center', showConfirmButton: false, timer: 1800, timerProgressBar: true,
            background: popup.toastBg, color: popup.toastColor,
          });
        });
        modal.querySelector('#saveContactBtn')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const vcard = generateVCard(contact);
            trackAnalyticsEvent('save_contact');
            const fileName = `${contact.name || 'contact'}.vcf`;
            const shared = await shareVCardFile(vcard, fileName);
            if (shared) {
              Swal.fire({ icon: 'success', title: 'Contact Shared!', text: 'Use the share sheet to add to contacts.', background: popup.background, color: popup.color, confirmButtonColor: popup.accent });
              return;
            }
            downloadVCard(vcard, fileName);
            Swal.fire({ icon: 'success', title: 'Contact Saved!', text: 'The vCard file has been downloaded.', toast: true, position: 'center', showConfirmButton: false, timer: 2000, timerProgressBar: true, background: popup.toastBg, color: popup.toastColor });
          } catch (err) {
            Swal.fire({ icon: 'error', title: 'Save failed', text: 'Could not save contact.', background: popup.background, color: popup.color });
          }
        });
      },
    });
  } catch (error) {
    console.error('Error in showContactDetails:', error);
    const popup = getPopupTheme();
    await Swal.fire({ icon: 'error', title: 'Error', text: 'Could not display contact details', background: popup.background, color: popup.color });
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showError(message) {
  const container = document.querySelector('.card-container') || document.body;
  container.innerHTML = `
    <div class="error-message">
      <h3 class="error-title">${escapeHtml(message)}</h3>
      <p class="error-subtext">Please check the URL or try again later.</p>
    </div>`;
  document.body.classList.remove('loading');
  document.querySelector('.loader')?.remove();
}

window.showContactDetails = showContactDetails;
window.showShareOptions = showShareOptions;

async function showShareOptions(link) {
  trackAnalyticsEvent('share_click');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Check out this profile', text: 'View my digital business card', url: link });
    } else {
      const popup = getPopupTheme();
      const shareHtml = `
        <div class="share-options">
          <h3>Share this profile</h3>
          <div class="share-links">
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" rel="noopener" class="share-link facebook">Facebook</a>
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}" target="_blank" rel="noopener" class="share-link twitter">Twitter</a>
            <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}" target="_blank" rel="noopener" class="share-link linkedin">LinkedIn</a>
            <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(link)}" target="_blank" rel="noopener" class="share-link whatsapp">WhatsApp</a>
          </div>
        </div>`;
      Swal.fire({
        title: 'Share Profile', html: shareHtml,
        showCancelButton: true, cancelButtonText: 'Close',
        background: popup.background, color: popup.color,
        customClass: { confirmButton: 'swal-confirm-button', cancelButton: 'swal-cancel-button', popup: popup.isLight ? 'swal-theme-light' : 'swal-theme-dark' },
      });
    }
  } catch (error) { console.error('Error sharing:', error); }
}
