/* renderer.js — shared card renderer. Pure function; no DOM reads. */

export const TEMPLATES = [
  'classic', 'hero', 'split', 'minimal',
  'editorial', 'bento', 'poster', 'compact'
];

export const TEMPLATE_META = [
  { id: 'classic',   label: 'Classic',   glyph: '▭' },
  { id: 'hero',      label: 'Hero',      glyph: '◠' },
  { id: 'split',     label: 'Split',     glyph: '◫' },
  { id: 'minimal',   label: 'Minimal',   glyph: '···' },
  { id: 'editorial', label: 'Editorial', glyph: 'Aa' },
  { id: 'bento',     label: 'Bento',     glyph: '⊞' },
  { id: 'poster',    label: 'Poster',    glyph: 'P' },
  { id: 'compact',   label: 'Compact',   glyph: '▤' },
];

/* ── Parse "…|t=hero|a=#f59e0b" ───────────────────────────── */
export function parseStyleParams(raw) {
  if (typeof raw !== 'string' || !raw) {
    return { base: '', template: 'classic', accent: '' };
  }
  const parts = raw.split('|');
  const base = parts[0].trim();
  let template = 'classic', accent = '';
  for (let i = 1; i < parts.length; i++) {
    const m = parts[i].match(/^(t|a)=(.+)$/);
    if (!m) continue;
    if (m[1] === 't') template = m[2].trim();
    if (m[1] === 'a') accent = m[2].trim();
  }
  return { base, template, accent };
}

/* ── Public entry point ───────────────────────────────────── */
export function renderCardHtml(profile, options = {}) {
  const { theme = 'dark', accent = '', template, interactive = true } = options;
  const id = TEMPLATES.includes(template) ? template : 'classic';
  const safeProfile = {
    ...profile,
    profilePic: profile?.profilePic || 'https://tccards.tn/Assets/default.png',
  };
  return RENDERERS[id](safeProfile, { theme, accent, interactive });
}

/* ── Internal helpers ─────────────────────────────────────── */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
const escapeHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function normalizeUrl(link) {
  if (!link) return '';
  let s = String(link).trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { return new URL(s).href; } catch { return ''; }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function colorsForTheme(theme) {
  if (theme === 'light') {
    return {
      cardBg: 'rgba(255,255,255,0.2)',
      cardBorder: 'rgba(255,255,255,0.4)',
      text: '#111827',
      sub: '#374151',
      nameBg: 'rgba(255,255,255,0.3)',
      itemBg: 'rgba(0,0,0,0.06)',
      itemHover: 'rgba(0,0,0,0.12)',
      iconBg: 'rgba(0,0,0,0.06)',
    };
  }
  if (theme === 'default') {
    return {
      cardBg: 'linear-gradient(145deg, rgba(17,24,39,0.72), rgba(2,6,23,0.55))',
      cardBorder: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      sub: '#d1d5db',
      nameBg: 'rgba(31,41,55,1)',
      itemBg: 'rgba(255,255,255,0.1)',
      itemHover: 'rgba(255,255,255,0.18)',
      iconBg: 'rgba(255,255,255,0.08)',
    };
  }
  return {
    cardBg: 'rgba(17,24,39,0.85)',
    cardBorder: 'rgba(255,255,255,0.15)',
    text: '#ffffff',
    sub: '#d1d5db',
    nameBg: 'rgba(31,41,55,1)',
    itemBg: 'rgba(255,255,255,0.1)',
    itemHover: 'rgba(255,255,255,0.18)',
    iconBg: 'rgba(255,255,255,0.08)',
  };
}

function defaultAccent(theme) {
  return theme === 'light' ? '#2563eb' : '#3b82f6';
}

function hasContact(p) {
  return !!(p.email || p.phone || p.address);
}

function iconFor(domain) {
  return `<img src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico" alt=""
    class="w-5 h-5 rounded flex-shrink-0 object-contain"
    onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex';">
    <i class="fas fa-link social-icon-fallback" style="display:none;width:20px;text-align:center;opacity:.65;"></i>`;
}

function socialRows(links, theme, variant = 'stack', interactive = true) {
  const items = (links || [])
    .map(normalizeUrl)
    .filter(Boolean)
    .map((url) => ({ url, domain: domainOf(url) }));
  if (!items.length) return '';

  const c = colorsForTheme(theme);
  const text = theme === 'light' ? '#1e293b' : '#fff';
  const hrefAttr = (it) =>
    interactive ? `href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"` : 'href="#"';

  if (variant === 'chips') {
    return `<div class="flex flex-wrap justify-center gap-2">${items
      .map(
        (it) => `<a ${hrefAttr(it)} class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors" style="background:${c.itemBg};color:${text};${interactive ? '' : 'pointer-events:none;cursor:default;'}">${iconFor(it.domain)}<span>${escapeHtml(it.domain)}</span></a>`
      )
      .join('')}</div>`;
  }

  if (variant === 'grid') {
    return `<div class="grid grid-cols-2 gap-2">${items
      .slice(0, 4)
      .map(
        (it) => `<a ${hrefAttr(it)} class="flex flex-col justify-between gap-2 p-4 rounded-2xl min-h-[92px] transition-colors" style="background:${c.itemBg};color:${text};${interactive ? '' : 'pointer-events:none;cursor:default;'}">${iconFor(it.domain)}<span class="text-xs font-medium truncate">${escapeHtml(it.domain)}</span></a>`
      )
      .join('')}</div>`;
  }

  if (variant === 'grid-compact') {
    return `<div class="grid grid-cols-2 gap-1.5">${items
      .map(
        (it) => `<a ${hrefAttr(it)} class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs truncate transition-colors" style="background:${c.itemBg};color:${text};${interactive ? '' : 'pointer-events:none;cursor:default;'}">${iconFor(it.domain)}<span class="truncate">${escapeHtml(it.domain)}</span></a>`
      )
      .join('')}</div>`;
  }

  return `<div class="flex flex-col gap-2">${items
    .map(
      (it) => `<a ${hrefAttr(it)} class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-transform" style="background:${c.itemBg};color:${text};${interactive ? 'will-change:transform;' : 'pointer-events:none;cursor:default;'}">${iconFor(it.domain)}<span>${escapeHtml(it.domain)}</span></a>`
    )
    .join('')}</div>`;
}

function shareButton(theme, interactive, posClass = '') {
  const c = colorsForTheme(theme);
  const inert = interactive ? '' : 'pointer-events:none;cursor:default;';
  const onclick = interactive ? 'onclick="showShareOptions(location.href)"' : '';
  return `<button ${onclick} type="button" aria-label="Share" class="w-9 h-9 rounded-full flex items-center justify-center transition-colors ${posClass}" style="background:${c.iconBg};color:${c.text};${inert}">
    <i class="fas fa-share-alt text-sm" aria-hidden="true"></i>
  </button>`;
}

function contactButton(profile, theme, accent, interactive, extraClass = '') {
  const bg = accent || defaultAccent(theme);
  const inert = interactive ? '' : 'pointer-events:none;cursor:default;';
  const onclick = interactive
    ? `onclick='showContactDetails(${escapeHtml(
        JSON.stringify({
          name: profile.name,
          profilepic: profile.profilePic,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
        })
      )})'`
    : '';
  return `<button ${onclick} type="button" class="w-full py-3 rounded-xl font-medium text-white transition-transform ${extraClass}" style="background:${bg};box-shadow:0 8px 24px rgba(0,0,0,0.22);${inert}">Get in Touch</button>`;
}

function footer(theme, variant = 'default') {
  const c = colorsForTheme(theme);
  const year = new Date().getFullYear();
  if (variant === 'tiny') {
    return `<div class="mt-3 pt-3 text-center text-[10px]" style="color:${c.sub};opacity:0.7;">
      Powered by Total Connect ${year}
    </div>`;
  }
  if (variant === 'inline') {
    return `<div class="mt-4 pt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs" style="color:${c.sub};border-top:1px solid ${c.cardBorder};">
      <a href="https://tccards.tn" class="hover:underline" style="color:${c.sub};">&copy; Total Connect ${year}</a>
      <span style="opacity:0.4;">·</span>
      <a href="https://plans.tccards.tn" target="_blank" style="color:#34d399;font-weight:500;">Get your Card</a>
    </div>`;
  }
  return `<div class="mt-6 pt-4 flex flex-col items-center gap-2 text-xs" style="border-top:1px solid ${c.cardBorder};">
    <a href="https://tccards.tn" class="py-2 px-4 rounded-lg backdrop-blur-md" style="background:${c.itemBg};color:${c.sub};border:1px solid ${c.cardBorder};">Powered by &copy; Total Connect ${year}</a>
    <a href="https://plans.tccards.tn" target="_blank" class="py-2 px-4 rounded-lg font-medium" style="color:#34d399;">Get your Card</a>
  </div>`;
}

/* ── Template renderers ───────────────────────────────────── */

const RENDERERS = {
  /* ─── Classic — pixel-matched to today's card ─────────────── */
  classic: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    return `
      <div class="w-full max-w-md p-6 md:p-24 rounded-xl shadow-2xl mx-auto relative"
           style="background:${c.cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${c.cardBorder};box-shadow:0 20px 25px -5px rgba(0,0,0,0.4),0 10px 10px -5px rgba(0,0,0,0.2);">
        ${shareButton(theme, interactive, 'absolute top-4 right-4')}
        <div class="flex flex-col items-center">
          <img src="${escapeHtml(p.profilePic)}" alt=""
               class="w-32 h-32 rounded-full object-cover mb-4"
               style="box-shadow:0 0 0 4px ${theme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'};">
          <div class="w-full h-12 rounded mb-2 flex items-center justify-center shadow-lg"
               style="background:${c.nameBg};">
            <h1 class="text-2xl font-bold truncate px-2" style="color:${c.text};">${escapeHtml(p.name)}</h1>
          </div>
          ${p.tagline ? `<p class="text-sm mb-4 text-center px-2" style="color:${c.sub};text-shadow:0 2px 4px rgba(0,0,0,0.8);">${escapeHtml(p.tagline)}</p>` : ''}
          <div class="w-full mb-4">${socialRows(p.socialLinks, theme, 'stack', interactive)}</div>
          ${hasContact(p) ? `<div class="w-48 h-12 rounded mb-4 flex items-center justify-center shadow-lg overflow-hidden" style="background:${theme === 'light' ? 'rgba(255,255,255,0.3)' : 'rgba(31,41,55,1)'};">${contactButton(p, theme, accent, interactive, 'h-full rounded-none')}</div>` : ''}
        </div>
        ${footer(theme)}
      </div>`;
  },

  /* ─── Hero — image-first, avatar straddles the panel ──────── */
  hero: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl relative"
           style="border:1px solid ${c.cardBorder};background:${c.cardBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-20')}
        <div class="h-48 md:h-56 relative">
          <div class="absolute inset-0 pointer-events-none" style="background:linear-gradient(to bottom, transparent 30%, ${theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(17,24,39,0.85)'} 100%);"></div>
        </div>
        <div class="relative -mt-16 flex justify-center">
          <img src="${escapeHtml(p.profilePic)}" alt=""
               class="w-32 h-32 rounded-full object-cover"
               style="border:4px solid ${a};box-shadow:0 10px 30px rgba(0,0,0,0.45);">
        </div>
        <div class="px-6 pt-4 pb-6 text-center">
          <h1 class="text-2xl md:text-3xl font-bold" style="color:${c.text};">${escapeHtml(p.name)}</h1>
          ${p.tagline ? `<p class="mt-2 text-sm leading-relaxed" style="color:${c.sub};">${escapeHtml(p.tagline)}</p>` : ''}
          <div class="mt-5">${socialRows(p.socialLinks, theme, 'stack', interactive)}</div>
          ${hasContact(p) ? `<div class="mt-5">${contactButton(p, theme, accent, interactive)}</div>` : ''}
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── Split — two-column professional ─────────────────────── */
  split: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    return `
      <div class="w-full max-w-2xl mx-auto rounded-3xl shadow-2xl relative overflow-hidden"
           style="background:${c.cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${c.cardBorder};">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-20')}
        <div class="grid grid-cols-1 md:grid-cols-2">
          <div class="p-6 md:p-8 flex flex-col items-center justify-center text-center md:border-r" style="border-color:${c.cardBorder};">
            <img src="${escapeHtml(p.profilePic)}" alt=""
                 class="w-28 h-28 rounded-full object-cover mb-4"
                 style="border:3px solid ${accent || defaultAccent(theme)};box-shadow:0 8px 24px rgba(0,0,0,0.35);">
            <h1 class="text-2xl font-bold" style="color:${c.text};">${escapeHtml(p.name)}</h1>
            ${p.tagline ? `<p class="mt-2 text-sm" style="color:${c.sub};">${escapeHtml(p.tagline)}</p>` : ''}
            ${hasContact(p) ? `<div class="mt-6 w-full">${contactButton(p, theme, accent, interactive)}</div>` : ''}
          </div>
          <div class="p-6 md:p-8 flex flex-col justify-center">
            <p class="text-xs uppercase tracking-widest mb-3" style="color:${c.sub};">Find me online</p>
            ${socialRows(p.socialLinks, theme, 'stack', interactive)}
          </div>
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── Minimal — no card, poster-on-background ─────────────── */
  minimal: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const shadow = theme === 'light' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.6)';
    return `
      <div class="w-full max-w-sm mx-auto">
        <div class="flex flex-col items-center text-center mb-6 relative">
          ${shareButton(theme, interactive, 'absolute top-0 right-0')}
          <img src="${escapeHtml(p.profilePic)}" alt=""
               class="w-24 h-24 rounded-full object-cover mb-3"
               style="border:2px solid ${accent || defaultAccent(theme)};box-shadow:0 8px 24px rgba(0,0,0,0.45);">
          <h1 class="text-2xl font-bold" style="color:${c.text};text-shadow:${shadow};">${escapeHtml(p.name)}</h1>
          ${p.tagline ? `<p class="mt-1 text-sm" style="color:${c.sub};text-shadow:${shadow};">${escapeHtml(p.tagline)}</p>` : ''}
        </div>
        ${socialRows(p.socialLinks, theme, 'stack', interactive)}
        ${hasContact(p) ? `<div class="mt-4">${contactButton(p, theme, accent, interactive)}</div>` : ''}
        <div class="mt-6 text-center text-xs" style="color:${c.sub};opacity:0.8;text-shadow:${shadow};">
          Powered by Total Connect ${new Date().getFullYear()}
        </div>
      </div>`;
  },

  /* ─── Editorial — serif masthead, chips, accent rule ──────── */
  editorial: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl relative"
           style="background:${c.cardBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid ${c.cardBorder};">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-10')}
        <div class="p-6 md:p-8">
          <div class="flex items-start justify-between gap-4 mb-3">
            <div class="flex-1 min-w-0">
              <p class="text-[10px] uppercase tracking-[0.25em] mb-2 font-medium" style="color:${a};">Digital Card</p>
              <h1 class="text-4xl font-black leading-tight break-words" style="color:${c.text};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(p.name)}</h1>
            </div>
            <img src="${escapeHtml(p.profilePic)}" alt=""
                 class="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                 style="border:2px solid ${a};">
          </div>
          ${p.tagline ? `<p class="text-base italic mt-3 mb-6 leading-relaxed" style="color:${c.sub};font-family:Georgia,'Times New Roman',serif;">&ldquo;${escapeHtml(p.tagline)}&rdquo;</p>` : ''}
          <div class="h-px w-full mb-5" style="background:linear-gradient(to right, ${a}, transparent);"></div>
          ${socialRows(p.socialLinks, theme, 'chips', interactive)}
          ${hasContact(p) ? `<div class="mt-6">${contactButton(p, theme, accent, interactive)}</div>` : ''}
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── Bento — tiles grid ──────────────────────────────────── */
  bento: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const a = accent || defaultAccent(theme);
    const tileStyle = `background:${c.cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${c.cardBorder};`;
    return `
      <div class="w-full max-w-md mx-auto grid grid-cols-2 gap-3">
        <div class="col-span-2 p-4 md:p-5 rounded-2xl flex items-center gap-4 relative" style="${tileStyle}">
          <img src="${escapeHtml(p.profilePic)}" alt=""
               class="w-16 h-16 rounded-xl object-cover flex-shrink-0"
               style="border:2px solid ${a};">
          <div class="flex-1 min-w-0">
            <h1 class="text-lg md:text-xl font-bold truncate" style="color:${c.text};">${escapeHtml(p.name)}</h1>
            ${p.tagline ? `<p class="text-xs mt-0.5 truncate" style="color:${c.sub};">${escapeHtml(p.tagline)}</p>` : ''}
          </div>
          ${shareButton(theme, interactive, 'flex-shrink-0')}
        </div>
        ${socialRows(p.socialLinks, theme, 'grid', interactive)}
        ${hasContact(p) ? `<div class="col-span-2">${contactButton(p, theme, accent, interactive, 'rounded-2xl')}</div>` : ''}
        <div class="col-span-2 text-center text-xs py-2" style="color:${c.sub};opacity:0.7;">
          Powered by Total Connect ${new Date().getFullYear()}
        </div>
      </div>`;
  },

  /* ─── NEW: Poster — billboard serif ───────────────────────── */
  poster: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl relative"
           style="background:${c.cardBg};backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid ${c.cardBorder};">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-10')}
        <div class="p-7 md:p-10">
          <p class="text-[10px] uppercase tracking-[0.3em] font-semibold mb-4" style="color:${a};">Digital&nbsp;Card</p>
          <h1 class="poster-title text-5xl md:text-6xl leading-[0.95] mb-4 break-words" style="color:${c.text};font-family:Georgia,'Times New Roman',serif;font-weight:900;letter-spacing:-0.02em;">${escapeHtml(p.name)}</h1>
          ${p.tagline ? `<p class="text-base italic mb-6 leading-snug" style="color:${c.sub};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(p.tagline)}</p>` : ''}
          <div class="h-1 w-16 rounded mb-6" style="background:${a};"></div>
          <div class="flex items-center gap-3 mb-6">
            <img src="${escapeHtml(p.profilePic)}" alt=""
                 class="w-14 h-14 rounded-full object-cover flex-shrink-0"
                 style="border:2px solid ${a};">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-widest" style="color:${c.sub};">Find me online</p>
              <p class="text-sm font-medium truncate" style="color:${c.text};">${escapeHtml(domainOf(normalizeUrl((p.socialLinks||[])[0])) || 'View my links below')}</p>
            </div>
          </div>
          ${socialRows(p.socialLinks, theme, 'stack', interactive)}
          ${hasContact(p) ? `<div class="mt-6">${contactButton(p, theme, accent, interactive)}</div>` : ''}
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── NEW: Compact — dense 2-column link grid ─────────────── */
  compact: (p, { theme, accent, interactive }) => {
    const c = colorsForTheme(theme);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-sm mx-auto rounded-2xl shadow-xl overflow-hidden relative"
           style="background:${c.cardBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid ${c.cardBorder};">
        <div class="p-5">
          <div class="flex items-center gap-3">
            <img src="${escapeHtml(p.profilePic)}" alt=""
                 class="w-12 h-12 rounded-full object-cover flex-shrink-0"
                 style="border:2px solid ${a};">
            <div class="flex-1 min-w-0">
              <h1 class="text-base font-bold truncate" style="color:${c.text};">${escapeHtml(p.name)}</h1>
              ${p.tagline ? `<p class="text-xs truncate" style="color:${c.sub};">${escapeHtml(p.tagline)}</p>` : ''}
            </div>
            ${shareButton(theme, interactive, 'flex-shrink-0')}
          </div>
          <div class="h-px w-full my-3" style="background:${c.cardBorder};"></div>
          ${socialRows(p.socialLinks, theme, 'grid-compact', interactive)}
          ${hasContact(p) ? `<div class="mt-3">${contactButton(p, theme, accent, interactive, 'text-sm py-2 rounded-lg')}</div>` : ''}
          ${footer(theme, 'tiny')}
        </div>
      </div>`;
  },
};