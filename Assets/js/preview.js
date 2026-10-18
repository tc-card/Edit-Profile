/*
 * Public-card preview renderer.
 *
 * This module owns only preview markup and preview-safe formatting. Form state,
 * persistence, and style validation remain in profile.js.
 */

export function buildPublicPreviewHtml(data) {
  const { name, tagline, profilePic, socialLinks, background, cardTheme } = data;
  const currentYear = new Date().getFullYear();
  const theme = cardTheme === 'light' ? 'light' : 'dark';

  const bgStyleAttr = background && background.trim() !== ''
    ? `background: ${background}; background-size: cover; background-position: center; background-repeat: no-repeat;`
    : `background: linear-gradient(145deg, rgb(2, 6, 23), rgb(15, 23, 42), rgb(2, 6, 23)); background-size: cover; background-position: center; background-repeat: no-repeat;`;

  const cardBg = theme === 'light' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(17, 24, 39, 0.85)';
  const cardBorder = theme === 'light' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.15)';
  const nameBg = theme === 'light' ? 'rgba(255, 255, 255, 0.68)' : 'rgba(31, 41, 55, 0.9)';
  const nameText = theme === 'light' ? '#111827' : '#ffffff';
  const taglineText = theme === 'light' ? '#1f2937' : '#d1d5db';
  const shareIconBg = theme === 'light' ? 'rgba(255, 255, 255, 0.78)' : 'rgba(31, 41, 55, 0.95)';
  const shareIconText = theme === 'light' ? '#1f2937' : '#e5e7eb';
  const footerText = theme === 'light' ? '#1f2937' : '#d1d5db';
  const dividerColor = theme === 'light' ? 'rgba(17, 24, 39, 0.12)' : 'rgba(255, 255, 255, 0.12)';

  return `
    <div class="w-full min-h-full" style="${bgStyleAttr}">
      <div class="w-full min-h-full flex items-start justify-center p-4" style="background: rgba(255,255,255,0.05); backdrop-filter: blur(10px);">
        <div class="w-full max-w-md p-6 rounded-2xl shadow-2xl" style="background: ${cardBg}; backdrop-filter: blur(20px); border: 1px solid ${cardBorder};">
          <div class="w-full flex justify-end mb-2">
            <div class="w-9 h-9 rounded-full flex items-center justify-center shadow-sm" style="background:${shareIconBg}; color:${shareIconText};">
              <i class="fas fa-share-alt text-sm" style="color:${shareIconText};"></i>
            </div>
          </div>
          <div class="w-full flex justify-center mb-4">
            <img src="${profilePic || 'https://tccards.tn/Assets/default.png'}" class="w-32 h-32 bg-gray-800 rounded-full object-cover ring-4 ring-white/20" alt="Profile" onerror="this.src='https://tccards.tn/Assets/default.png'">
          </div>
          <div class="w-full min-h-12 rounded-xl mb-3 px-4 flex items-center justify-center shadow-sm" style="background:${nameBg};">
            <h1 class="text-2xl font-bold text-center break-words" style="color:${nameText};">${escapeHtml(name) || 'Your Name'}</h1>
          </div>
          ${tagline ? `<p class="tagline-text text-center mb-4 leading-relaxed" style="color:${taglineText};">${escapeHtml(tagline)}</p>` : ''}
          <div class="w-full bg-transparent mb-4">${renderSocialLinksPreview(socialLinks, theme)}</div>
          <div class="mt-4 pt-4" style="border-top:1px solid ${dividerColor};">
            <div class="w-full py-2 rounded-xl backdrop-blur-md text-center" style="background:${theme === 'light' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)'}; border:1px solid ${dividerColor};">
              <span class="text-xs" style="color:${footerText};">Powered by Total Connect ${currentYear}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSocialLinksPreview(links, theme = 'dark') {
  if (!links || links.length === 0) return '';
  const linkTextColor = theme === 'light' ? '#1f2937' : '#ffffff';

  return `<div class="social-links" style="display:flex; flex-direction:column; gap:10px; width:100%;">
    ${links.map((link) => {
      let href = link.trim();
      if (!href) return '';
      if (!/^https?:\/\//i.test(href)) href = `https://${href}`;

      try {
        const url = new URL(href);
        const domain = url.hostname.replace(/^www\./, '');
        return `
          <a href="#" style="display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.12); padding:12px 16px; border-radius:12px; color:${linkTextColor}; text-decoration:none; font-size:16px; pointer-events:none; cursor:default;">
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

function escapeHtml(value) {
  if (!value) return '';
  return value.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
