/* renderer.js — shared card renderer (editor + presenter: keep byte-identical).
 * Pure functions; no DOM reads.
 *
 * Style string (the single DB column), all optional, order-independent:
 *   <base>|t=<template>|a=<#hex>|cb=<0-40>|bb=<0-20>|co=<10-100>
 *   cb = card blur px, bb = background blur px, co = card opacity %.
 * Unknown keys are ignored by every version, so old clients keep working. */

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

const DEFAULT_PIC = 'https://tccards.tn/Assets/default.png';
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function clampInt(v, lo, hi) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
}

/* ── Parse / serialize the style string ───────────────────── */
export function parseStyleParams(raw) {
  const out = { base: '', template: 'classic', accent: '', cardBlur: null, bgBlur: null, cardOpacity: null };
  if (typeof raw !== 'string' || !raw) return out;
  const parts = raw.split('|');
  out.base = parts[0].trim();
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=');
    if (eq < 1) continue;
    const k = parts[i].slice(0, eq).trim();
    const v = parts[i].slice(eq + 1).trim();
    if (k === 't') { if (TEMPLATES.includes(v)) out.template = v; }
    else if (k === 'a') { if (HEX.test(v)) out.accent = v.toLowerCase(); }
    else if (k === 'cb') out.cardBlur = clampInt(v, 0, 40);
    else if (k === 'bb') out.bgBlur = clampInt(v, 0, 20);
    else if (k === 'co') out.cardOpacity = clampInt(v, 10, 100);
  }
  return out;
}

export function serializeStyleParams({ base = '', template, accent, cardBlur, bgBlur, cardOpacity }) {
  let s = base;
  if (template && template !== 'classic' && TEMPLATES.includes(template)) s += `|t=${template}`;
  if (accent && HEX.test(accent)) s += `|a=${accent.toLowerCase()}`;
  const cb = clampInt(cardBlur, 0, 40);     if (cb !== null) s += `|cb=${cb}`;
  const bb = clampInt(bgBlur, 0, 20);       if (bb !== null) s += `|bb=${bb}`;
  const co = clampInt(cardOpacity, 10, 100); if (co !== null) s += `|co=${co}`;
  return s;
}

/* ── Blurred page background layer (only built when bb > 0) ── */
export function backgroundLayerHtml(background, bgBlur, position = 'fixed') {
  const blur = clampInt(bgBlur, 0, 20);
  if (!blur || typeof background !== 'string') return ''; // 0 / unset = no layer
  const m = background.match(/url\(\s*["']?(.*?)["']?\s*\)/i);
  const url = m && m[1];
  if (!url || !/^https?:\/\//i.test(url)) return '';
  const safe = escapeHtml(url.replace(/["'()\\\s<>]/g, (ch) => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')));
  const fixed = position === 'fixed';
  const bleed = blur * 2 + 8; // hides the soft edge the blur creates
  return `<div id="bgBlurLayer" aria-hidden="true" style="position:${fixed ? 'fixed' : 'absolute'};top:-${bleed}px;left:-${bleed}px;right:-${bleed}px;bottom:-${bleed}px;z-index:${fixed ? -1 : 0};pointer-events:none;background:url(${safe}) center/cover no-repeat;filter:blur(${blur}px);"></div>`;
}

/* ── Public entry point ───────────────────────────────────── */
export function renderCardHtml(profile, options = {}) {
  const { theme = 'dark', accent = '', template, interactive = true, cardBlur = null, cardOpacity = null } = options;
  const id = TEMPLATES.includes(template) ? template : 'classic';
  const safeProfile = {
    ...profile,
    profilePic: profile?.profilePic || DEFAULT_PIC,
  };
  return RENDERERS[id](safeProfile, {
    theme,
    accent: HEX.test(accent) ? accent : '',
    interactive,
    cardBlur: clampInt(cardBlur, 0, 40),
    cardOpacity: clampInt(cardOpacity, 10, 100),
  });
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

function colorsForTheme(theme, o) {
  let c;
  if (theme === 'light') {
    c = {
      cardBg: 'rgba(255,255,255,0.2)',
      cardBorder: 'rgba(255,255,255,0.4)',
      text: '#111827',
      sub: '#374151',
      nameBg: 'rgba(255,255,255,0.3)',
      itemBg: 'rgba(0,0,0,0.06)',
      itemHover: 'rgba(0,0,0,0.12)',
      iconBg: 'rgba(0,0,0,0.06)',
    };
  } else if (theme === 'default') {
    c = {
      cardBg: 'linear-gradient(145deg, rgba(17,24,39,0.72), rgba(2,6,23,0.55))',
      cardBorder: 'rgba(255,255,255,0.15)',
      text: '#ffffff',
      sub: '#d1d5db',
      nameBg: 'rgba(31,41,55,1)',
      itemBg: 'rgba(255,255,255,0.1)',
      itemHover: 'rgba(255,255,255,0.18)',
      iconBg: 'rgba(255,255,255,0.08)',
    };
  } else {
    c = {
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
  c.blur = null;
  if (o) {
    if (o.cardOpacity != null) {
      c.cardBg = `rgba(${theme === 'light' ? '255,255,255' : '17,24,39'},${(o.cardOpacity / 100).toFixed(2)})`;
    }
    c.blur = o.cardBlur;
  }
  return c;
}

/* Card glass: user override wins, otherwise the template's own default. 0 = no filter at all. */
function glass(c, defaultPx) {
  const px = c.blur ?? defaultPx;
  return px > 0 ? `backdrop-filter:blur(${px}px);-webkit-backdrop-filter:blur(${px}px);` : '';
}

function defaultAccent(theme) {
  return theme === 'light' ? '#2563eb' : '#3b82f6';
}

/* Readable label colour on an accent fill. Threshold keeps blues white, flips ambers/limes dark. */
function onColor(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  let h = m[1];
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111827' : '#ffffff';
}

function hasContact(p) {
  return !!(p.email || p.phone || p.address);
}

function normalizeSocialLinks(links) {
  if (Array.isArray(links)) {
    return links.map((link) => String(link).trim()).filter(Boolean);
  }
  if (typeof links === 'string') {
    return links.split(/\r?\n/).map((link) => link.trim()).filter(Boolean);
  }
  return [];
}

function hasLinks(p) {
  return normalizeSocialLinks(p.socialLinks).some((link) => normalizeUrl(link));
}

function iconFor(domain) {
  const encodedDomain = encodeURIComponent(domain);
  const duckDuckGoUrl = `https://icons.duckduckgo.com/ip3/${encodedDomain}.ico`;
  const googleUrl = `https://www.google.com/s2/favicons?domain=${encodedDomain}&sz=64`;
  const directUrl = `https://${domain}/favicon.ico`;

  return `<img src="${duckDuckGoUrl}" alt=""
    class="w-5 h-5 rounded flex-shrink-0 object-contain"
    data-fallback="duckduckgo"
    onerror="if(this.dataset.fallback==='duckduckgo'){this.dataset.fallback='google';this.src='${googleUrl}';}else if(this.dataset.fallback==='google'){this.dataset.fallback='direct';this.src='${directUrl}';}else{this.style.display='none';this.nextElementSibling.style.display='inline-flex';}">
    <i class="fas fa-link social-icon-fallback" style="display:none;width:20px;text-align:center;opacity:.65;"></i>`;
}

function socialRows(links, theme, variant = 'stack', interactive = true, tileStyle = '') {
  const items = normalizeSocialLinks(links)
    .map(normalizeUrl)
    .filter(Boolean)
    .map((url) => ({ url, domain: domainOf(url) }));
  if (!items.length) return '';

  const c = colorsForTheme(theme);
  const text = theme === 'light' ? '#1e293b' : '#fff';
  const hrefAttr = (it) =>
    interactive ? `href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"` : 'href="#"';
  const inert = interactive ? '' : 'pointer-events:none;cursor:default;';

  if (variant === 'chips') {
    return `<div class="flex flex-wrap justify-center gap-2">${items
      .map((it) => `<a ${hrefAttr(it)} class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors" style="background:${c.itemBg};color:${text};${inert}">${iconFor(it.domain)}<span>${escapeHtml(it.domain)}</span></a>`)
      .join('')}</div>`;
  }

  if (variant === 'grid') {
    return `<div class="col-span-2 grid grid-cols-2 gap-2">${items
      .map((it) => `<a ${hrefAttr(it)} class="flex flex-col justify-between gap-2 p-4 rounded-2xl transition-colors" style="min-height:92px;${tileStyle || `background:${c.itemBg};`}color:${text};${inert}">${iconFor(it.domain)}<span class="text-xs font-medium truncate">${escapeHtml(it.domain)}</span></a>`)
      .join('')}</div>`;
  }

  if (variant === 'grid-compact') {
    return `<div class="grid grid-cols-2 gap-1.5">${items
      .map((it) => `<a ${hrefAttr(it)} class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs truncate transition-colors" style="background:${c.itemBg};color:${text};${inert}">${iconFor(it.domain)}<span class="truncate">${escapeHtml(it.domain)}</span></a>`)
      .join('')}</div>`;
  }

  return `<div class="flex flex-col gap-2">${items
    .map((it) => `<a ${hrefAttr(it)} class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-transform" style="background:${c.itemBg};color:${text};${interactive ? 'will-change:transform;' : inert}">${iconFor(it.domain)}<span>${escapeHtml(it.domain)}</span></a>`)
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
  return `<button ${onclick} type="button" class="w-full py-3 rounded-xl font-medium transition-transform ${extraClass}" style="background:${bg};color:${onColor(bg)};box-shadow:0 8px 24px rgba(0,0,0,0.22);${inert}">Get in Touch</button>`;
}

function footer(theme, variant = 'default') {
  const c = colorsForTheme(theme);
  const year = new Date().getFullYear();
  if (variant === 'tiny') {
    return `<div class="mt-3 pt-3 text-center" style="font-size:10px;color:${c.sub};opacity:0.7;">
      Powered by Total Connect ${year}
    </div>`;
  }
  if (variant === 'inline') {
    return `<div class="mt-4 pt-3 pb-4 px-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs" style="color:${c.sub};border-top:1px solid ${c.cardBorder};">
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
  classic: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    return `
      <div class="w-full max-w-md p-6 md:p-24 rounded-xl shadow-2xl mx-auto relative"
           style="background:${c.cardBg};${glass(c, 20)}border:1px solid ${c.cardBorder};box-shadow:0 20px 25px -5px rgba(0,0,0,0.4),0 10px 10px -5px rgba(0,0,0,0.2);">
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

  /* ─── Hero — blurred cover from the photo, avatar straddles ── */
  hero: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    const a = accent || defaultAccent(theme);
    const hasPic = p.profilePic && p.profilePic !== DEFAULT_PIC;
    const fade = theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(17,24,39,0.85)';
    return `
      <div class="w-full max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl relative"
           style="border:1px solid ${c.cardBorder};background:${c.cardBg};${glass(c, 24)}">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-20')}
        <div class="h-48 md:h-56 relative overflow-hidden" style="background:linear-gradient(135deg,${a},rgba(2,6,23,0.9));">
          ${hasPic ? `<img src="${escapeHtml(p.profilePic)}" alt="" class="absolute inset-0 w-full h-full object-cover" style="transform:scale(1.3);filter:blur(16px) saturate(1.15);opacity:.9;">` : ''}
          <div class="absolute inset-0 pointer-events-none" style="background:linear-gradient(to bottom, transparent 30%, ${fade} 100%);"></div>
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
  split: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    return `
      <div class="w-full max-w-2xl mx-auto rounded-3xl shadow-2xl relative overflow-hidden"
           style="background:${c.cardBg};${glass(c, 20)}border:1px solid ${c.cardBorder};">
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
            ${hasLinks(p) ? `<p class="text-xs uppercase mb-3" style="letter-spacing:0.15em;color:${c.sub};">Find me online</p>` : ''}
            ${socialRows(p.socialLinks, theme, 'stack', interactive)}
          </div>
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── Minimal — no card, poster-on-background ─────────────── */
  minimal: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
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
  editorial: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl relative"
           style="background:${c.cardBg};${glass(c, 24)}border:1px solid ${c.cardBorder};">
        <div class="p-6 md:p-8">
          <div class="flex items-center justify-between mb-3">
            <p class="uppercase font-medium" style="font-size:10px;letter-spacing:0.25em;color:${a};">Digital Card</p>
            ${shareButton(theme, interactive, 'flex-shrink-0')}
          </div>
          <div class="flex items-start justify-between gap-4 mb-3">
            <h1 class="flex-1 min-w-0 text-4xl font-black leading-tight break-words" style="color:${c.text};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(p.name)}</h1>
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
  bento: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    const a = accent || defaultAccent(theme);
    const tileStyle = `background:${c.cardBg};${glass(c, 20)}border:1px solid ${c.cardBorder};`;
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
        ${socialRows(p.socialLinks, theme, 'grid', interactive, tileStyle)}
        ${hasContact(p) ? `<div class="col-span-2">${contactButton(p, theme, accent, interactive, 'rounded-2xl')}</div>` : ''}
        <div class="col-span-2 text-center text-xs py-2" style="color:${c.sub};opacity:0.7;">
          Powered by Total Connect ${new Date().getFullYear()}
        </div>
      </div>`;
  },

  /* ─── Poster — billboard serif ────────────────────────────── */
  poster: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-2xl relative"
           style="background:${c.cardBg};${glass(c, 28)}border:1px solid ${c.cardBorder};">
        ${shareButton(theme, interactive, 'absolute top-4 right-4 z-10')}
        <div class="p-7 md:p-10">
          <p class="uppercase font-semibold mb-4" style="font-size:10px;letter-spacing:0.3em;color:${a};">Digital&nbsp;Card</p>
          <h1 class="text-5xl md:text-6xl mb-4 break-words" style="line-height:.95;color:${c.text};font-family:Georgia,'Times New Roman',serif;font-weight:900;letter-spacing:-0.02em;">${escapeHtml(p.name)}</h1>
          ${p.tagline ? `<p class="text-base italic mb-6 leading-snug" style="color:${c.sub};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(p.tagline)}</p>` : ''}
          <div class="h-1 w-16 rounded mb-6" style="background:${a};"></div>
          <div class="flex items-center gap-3 mb-6">
            <img src="${escapeHtml(p.profilePic)}" alt=""
                 class="w-14 h-14 rounded-full object-cover flex-shrink-0"
                 style="border:2px solid ${a};">
            ${hasLinks(p) ? `<p class="text-xs uppercase" style="letter-spacing:0.15em;color:${c.sub};">Find me online</p>` : ''}
          </div>
          ${socialRows(p.socialLinks, theme, 'stack', interactive)}
          ${hasContact(p) ? `<div class="mt-6">${contactButton(p, theme, accent, interactive)}</div>` : ''}
        </div>
        ${footer(theme, 'inline')}
      </div>`;
  },

  /* ─── Compact — dense 2-column link grid ──────────────────── */
  compact: (p, ctx) => {
    const { theme, accent, interactive } = ctx;
    const c = colorsForTheme(theme, ctx);
    const a = accent || defaultAccent(theme);
    return `
      <div class="w-full max-w-sm mx-auto rounded-2xl shadow-xl overflow-hidden relative"
           style="background:${c.cardBg};${glass(c, 20)}border:1px solid ${c.cardBorder};">
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