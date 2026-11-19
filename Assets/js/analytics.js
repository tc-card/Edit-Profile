import { CONFIG, DOM, state } from './config.js';

const ANALYTICS_METRICS = [
  { label: 'Profile visits', id: 'totalVisits', key: 'visits', icon: 'fa-eye', tone: 'text-sky-300', note: 'People who opened your profile' },
  { label: 'Link clicks', id: 'totalLinkClicks', key: 'link_clicks', icon: 'fa-arrow-pointer', tone: 'text-emerald-300', note: 'Clicks on your profile links' },
  { label: 'Contact saves', id: 'totalSaves', key: 'saves', icon: 'fa-address-card', tone: 'text-amber-300', note: 'Contacts saved from your card' },
  { label: 'Contact actions', id: 'totalContactActions', key: 'contact_actions', icon: 'fa-address-book', tone: 'text-orange-300', note: 'Email, phone, and location taps' },
  { label: 'Shares', id: 'totalShares', key: 'shares', icon: 'fa-share-nodes', tone: 'text-violet-300', note: 'Times your profile was shared' },
  { label: 'Copies', id: 'totalCopies', key: 'copies', icon: 'fa-copy', tone: 'text-cyan-300', note: 'Contact details copied' }
];

export function renderAnalyticsSection() {
  if (state.profileData?.plan !== 'standard') {
    DOM.profileEditor.innerHTML = `
      <section class="dashboard-view-shell space-y-6" aria-labelledby="analyticsUpgradeHeading">
        <div class="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 md:p-8 shadow-2xl">
          <div class="flex flex-wrap items-start justify-between gap-5">
            <div class="max-w-2xl">
              <span class="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-3 py-1 text-xs font-medium text-blue-200"><i class="fas fa-lock" aria-hidden="true"></i> Standard feature</span>
              <h2 id="analyticsUpgradeHeading" class="mt-5 text-3xl font-semibold tracking-tight text-white">Know what gets attention.</h2>
              <p class="mt-3 text-sm leading-6 text-slate-300">Standard analytics shows profile visits, popular links, and the contact actions people use.</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-300/10 text-2xl text-blue-200"><i class="fas fa-chart-line" aria-hidden="true"></i></div>
          </div>
          <div class="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4"><i class="fas fa-eye text-sky-300" aria-hidden="true"></i><p class="mt-3 text-sm font-medium text-white">Profile visits</p><p class="mt-1 text-xs text-slate-400">See when people open your card.</p></div>
            <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4"><i class="fas fa-arrow-pointer text-emerald-300" aria-hidden="true"></i><p class="mt-3 text-sm font-medium text-white">Link clicks</p><p class="mt-1 text-xs text-slate-400">Find out which links are used.</p></div>
            <div class="rounded-2xl border border-white/10 bg-white/[.04] p-4"><i class="fas fa-address-book text-amber-300" aria-hidden="true"></i><p class="mt-3 text-sm font-medium text-white">Contact actions</p><p class="mt-1 text-xs text-slate-400">Measure calls, emails, and saves.</p></div>
          </div>
          <a href="https://tccards.tn" target="_blank" rel="noopener noreferrer" class="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Explore Standard</a>
        </div>
      </section>`;
    return;
  }

  DOM.profileEditor.innerHTML = `
    <section class="dashboard-view-shell space-y-5" aria-labelledby="analyticsHeading">
      <header class="analytics-hero relative overflow-hidden rounded-3xl border border-blue-300/15 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6 md:p-8 shadow-xl">
        <div class="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true"></div>
        <div class="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <h2 id="analyticsHeading" class="mt-3 text-2xl font-semibold tracking-tight text-white sm:mt-4 sm:text-3xl md:text-4xl">Your profile, in focus.</h2>
            <p class="mt-2 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">A clear view of visits, link activity, and the ways people connect with you.</p>
          </div>
          <button type="button" id="refreshAnalyticsBtn" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[.06] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:border-white/25 hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"><i class="fas fa-rotate" aria-hidden="true"></i><span>Refresh</span></button>
        </div>
      </header>

      <div id="analyticsLoader" class="analytics-loader rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 text-sm text-slate-300" role="status" aria-live="polite"><i class="fas fa-spinner fa-spin mr-2 text-blue-300" aria-hidden="true"></i>Loading your analytics…</div>

      <div id="analyticsContent" class="hidden space-y-5">
        <div class="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          ${ANALYTICS_METRICS.map(renderMetricCard_).join('')}
        </div>
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <section class="analytics-panel rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 sm:rounded-2xl sm:p-5 md:p-6 xl:col-span-3" aria-labelledby="analyticsDailyHeading">
            <div class="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div><h3 id="analyticsDailyHeading" class="text-base font-semibold text-white">Daily activity</h3><p class="mt-1 text-xs text-slate-400">Visits and link clicks · last 30 days</p></div>
              <div class="flex items-center gap-4 text-xs text-slate-400"><span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-sky-400"></i>Visits</span><span class="inline-flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-emerald-400"></i>Link clicks</span></div>
            </div>
            <div id="analyticsDailyChart" class="mt-3 w-full sm:mt-5" role="img" aria-label="Daily profile visits and link clicks for the last 30 days"></div>
            <p id="analyticsPeakDate" class="analytics-peak-caption mt-2 text-xs text-slate-400" aria-live="polite"></p>
          </section>
          <section class="analytics-panel rounded-2xl border border-slate-700/70 bg-slate-900/70 p-3 sm:rounded-2xl sm:p-5 md:p-6 xl:col-span-2" aria-labelledby="analyticsLinksHeading">
            <div><h3 id="analyticsLinksHeading" class="text-base font-semibold text-white">Popular links</h3><p class="mt-1 text-xs text-slate-400">Domains people clicked most</p></div>
            <div id="topLinksList" class="mt-5 space-y-4"></div>
          </section>
        </div>
        <p id="analyticsUpdatedAt" class="text-right text-xs text-slate-500" aria-live="polite"></p>
      </div>
    </section>`;

  document.getElementById('refreshAnalyticsBtn')?.addEventListener('click', fetchAndRenderAnalytics_);
  void fetchAndRenderAnalytics_();
}

function renderMetricCard_(metric) {
  return `<article class="analytics-metric-card group rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 md:p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900">
    <div class="flex items-start justify-between gap-3"><div><p class="text-sm font-medium text-slate-300">${metric.label}</p><p class="mt-1 text-[11px] leading-4 text-slate-500">${metric.note}</p></div><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[.05] ${metric.tone}"><i class="fas ${metric.icon}" aria-hidden="true"></i></span></div>
    <p id="${metric.id}" class="mt-5 text-3xl font-semibold tracking-tight text-white">—</p>
    ${metric.key === 'contact_actions' ? '<p id="contactActionBreakdown" class="mt-1 text-[10px] leading-4 text-slate-500">Email 0 · Phone 0 · Location 0</p>' : ''}
  </article>`;
}

async function fetchAndRenderAnalytics_() {
  const loader = document.getElementById('analyticsLoader');
  const content = document.getElementById('analyticsContent');
  const refreshBtn = document.getElementById('refreshAnalyticsBtn');
  const buttonText = refreshBtn?.querySelector('span');
  if (!loader || !content) return;

  try {
    if (refreshBtn) refreshBtn.disabled = true;
    if (buttonText) buttonText.textContent = 'Loading';
    loader.innerHTML = '<i class="fas fa-spinner fa-spin mr-2 text-blue-300" aria-hidden="true"></i>Loading your analytics…';
    loader.classList.remove('hidden');
    content.classList.add('hidden');

    const response = await fetch(CONFIG.googleEditUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAnalytics', token: state.currentUser?.sessionToken })
    });
    if (!response.ok) throw new Error(`Analytics request failed (${response.status})`);
    const result = await response.json();
    if (result.status !== 'success' || !result.data) throw new Error(result.message || 'Failed to load analytics data');

    renderAnalyticsData_(result.data);
    loader.classList.add('hidden');
    content.classList.remove('hidden');
  } catch (error) {
    console.error('Analytics Error:', error);
    const message = error.message === 'SESSION_EXPIRED'
      ? 'Your session expired. Sign in again to view analytics.'
      : 'We couldn’t load your analytics. Try refreshing.';
    loader.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm text-rose-300"><i class="fas fa-circle-exclamation mr-2" aria-hidden="true"></i>${message}</p><button type="button" id="retryAnalyticsBtn" class="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/5">Try again</button></div>`;
    document.getElementById('retryAnalyticsBtn')?.addEventListener('click', fetchAndRenderAnalytics_);
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
    if (buttonText) buttonText.textContent = 'Refresh';
  }
}

function renderAnalyticsData_(stats) {
  const format = value => (Number(value) || 0).toLocaleString();
  const contacts = stats.contact_actions || {};
  const values = {
    totalVisits: stats.visits,
    totalLinkClicks: stats.link_clicks,
    totalSaves: stats.saves,
    totalContactActions: contacts.total,
    totalShares: stats.shares,
    totalCopies: stats.copies
  };
  Object.entries(values).forEach(([id, value]) => {
    const target = document.getElementById(id);
    if (target) target.textContent = format(value);
  });

  const breakdown = document.getElementById('contactActionBreakdown');
  if (breakdown) breakdown.textContent = `Email ${format(contacts.email)} · Phone ${format(contacts.phone)} · Location ${format(contacts.location)}`;
  renderPopularLinks_(stats.top_links, format);
  if (Array.isArray(stats.daily) && stats.daily.length) renderDailyChart_(stats.daily, format);
  else renderWeeklyFallback_(stats.weekly, format);

  const updatedAt = document.getElementById('analyticsUpdatedAt');
  const date = stats.updated_at ? new Date(stats.updated_at) : null;
  if (updatedAt) updatedAt.textContent = date && !Number.isNaN(date.getTime()) ? `Updated ${date.toLocaleString()}` : '';
}

function renderPopularLinks_(links, format) {
  const container = document.getElementById('topLinksList');
  if (!container) return;
  const items = Array.isArray(links) ? links : [];
  if (!items.length) {
    container.innerHTML = '<div class="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">Link activity will appear here as people explore your profile.</div>';
    return;
  }

  const max = Math.max(1, ...items.map(item => Number(item.count) || 0));
  container.innerHTML = items.map((item, index) => {
    const count = Math.max(0, Number(item.count) || 0);
    const width = Math.max(count ? 6 : 0, Math.round((count / max) * 100));
    const label = escapeHtml_(item.label || 'Link');
    return `<div><div class="mb-2 flex items-center justify-between gap-3"><span class="flex min-w-0 items-center gap-2 text-sm text-slate-200"><span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[.05] text-[10px] font-semibold text-slate-400">${index + 1}</span><span class="truncate" title="${label}">${label}</span></span><span class="shrink-0 text-xs font-medium text-slate-400">${format(count)}</span></div><div class="h-1.5 overflow-hidden rounded-full bg-slate-800"><div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" style="width:${width}%"></div></div></div>`;
  }).join('');
}

function renderDailyChart_(days, format) {
  const heading = document.getElementById('analyticsDailyHeading');
  const description = heading?.nextElementSibling;
  const chart = document.getElementById('analyticsDailyChart');
  if (!chart) return;
  if (heading) heading.textContent = 'Daily activity';
  if (description) description.textContent = 'Visits and link clicks · last 30 days';
  chart.setAttribute('aria-label', 'Daily profile visits and link clicks for the last 30 days');
  const sourceDays = Array.isArray(days) ? days : [];
  const dataByDay = new Map(sourceDays.map(day => [String(day.date || '').slice(0, 10), day]));
  const dateKeys = [...dataByDay.keys()].filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort();
  const latestKey = dateKeys[dateKeys.length - 1];
  const endDate = latestKey ? new Date(`${latestKey}T00:00:00`) : new Date();
  endDate.setHours(0, 0, 0, 0);
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const normalized = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(endDate);
    date.setDate(date.getDate() - (29 - index));
    const key = dateKey(date);
    const source = dataByDay.get(key) || {};
    return {
      date: key,
      visits: Math.max(0, Number(source.visits) || 0),
      clicks: Math.max(0, Number(source.linkClicks ?? source.link_clicks) || 0)
    };
  });

  const activeDays = normalized.filter(day => day.visits || day.clicks);
  const peakDay = activeDays.reduce((peak, day) => {
    if (!peak || day.visits + day.clicks >= peak.visits + peak.clicks) return day;
    return peak;
  }, null);
  const peakDate = document.getElementById('analyticsPeakDate');
  if (peakDate && peakDay) {
    const date = new Date(`${peakDay.date}T00:00:00`);
    const label = Number.isNaN(date.getTime()) ? peakDay.date : date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    peakDate.innerHTML = `<span class="font-medium text-slate-300">Peak</span><strong class="font-semibold text-slate-100">${escapeHtml_(label)}</strong><span class="hidden sm:inline text-sky-300">${format(peakDay.visits)} visits</span><span class="hidden sm:inline text-emerald-300">${format(peakDay.clicks)} clicks</span>`;
  } else if (peakDate) {
    peakDate.textContent = '';
  }

  const width = 360;
  const height = 156;
  const left = 12;
  const right = 8;
  const top = 10;
  const bottom = 128;
  const xStep = (width - left - right) / (normalized.length - 1);
  const peak = Math.max(1, ...normalized.flatMap(day => [day.visits, day.clicks]));
  const yFor = value => bottom - ((value / peak) * (bottom - top));
  const visitPoints = normalized.map((day, index) => ({ x: left + xStep * index, y: yFor(day.visits), day, index }));
  const clickPoints = normalized.map((day, index) => ({ x: left + xStep * index, y: yFor(day.clicks), day, index }));
  const pathFor = points => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaFor = points => `${pathFor(points)} L${points[points.length - 1].x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`;
  const guides = [0, 0.5, 1].map(ratio => {
    const y = bottom - ratio * (bottom - top);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="3 5" />`;
  }).join('');
  const dateLabel = day => {
    const date = new Date(`${day.date}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  };
  const labelIndices = new Set([0, 7, 14, 21, 29]);
  const labels = normalized.map((day, index) => {
    if (!labelIndices.has(index)) return '';
    const x = left + xStep * index;
    const anchor = index === 0 ? 'start' : index === normalized.length - 1 ? 'end' : 'middle';
    return `<text x="${x.toFixed(1)}" y="150" text-anchor="${anchor}" fill="currentColor" fill-opacity=".6" font-size="9">${escapeHtml_(dateLabel(day))}</text>`;
  }).join('');
  const pointsFor = (points, color, series) => points.map(point => {
    const value = series === 'visits' ? point.day.visits : point.day.clicks;
    const title = `${dateLabel(point.day)}: ${format(value)} ${series === 'visits' ? 'visits' : 'link clicks'}`;
    return `<g class="analytics-chart-point" data-day-index="${point.index}" data-series="${series}" role="button" tabindex="0" aria-pressed="false" aria-describedby="analyticsChartTooltip" aria-label="${escapeHtml_(title)}"><circle class="analytics-chart-hit" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5" fill="#fff" fill-opacity=".01"/><circle class="analytics-chart-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.8" fill="${color}"/></g>`;
  }).join('');

  chart.innerHTML = `<div class="analytics-chart-stage relative w-full"><svg class="block h-36 w-full overflow-visible text-slate-400 sm:h-44" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="group" aria-label="Daily activity for the last 30 days. Focus or point to a node for details.">
    <defs><linearGradient id="analyticsVisitFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity=".22"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs>
    ${guides}
    <path d="${areaFor(visitPoints)}" fill="url(#analyticsVisitFill)" />
    <path d="${pathFor(visitPoints)}" fill="none" stroke="#38bdf8" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${pathFor(clickPoints)}" fill="none" stroke="#34d399" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" />
    ${pointsFor(visitPoints, '#38bdf8', 'visits')}
    ${pointsFor(clickPoints, '#34d399', 'clicks')}
    ${labels}
  </svg><div id="analyticsChartTooltip" class="analytics-chart-tooltip" role="tooltip" hidden></div></div>`;
  bindActivityPointInteractions_(chart, normalized, width, height, format, dateLabel);
}

function renderWeeklyFallback_(weeks, format) {
  const heading = document.getElementById('analyticsDailyHeading');
  const description = heading?.nextElementSibling;
  const chart = document.getElementById('analyticsDailyChart');
  if (!chart) return;
  if (heading) heading.textContent = 'Weekly activity';
  if (description) description.textContent = 'Visits and link clicks · latest 12 weeks';
  chart.setAttribute('aria-label', 'Weekly profile visits and link clicks');

  const sourceWeeks = Array.isArray(weeks) ? weeks : [];
  const dataByWeek = new Map(sourceWeeks.map(week => [String(week.weekStart || '').slice(0, 10), week]));
  const currentWeek = new Date();
  currentWeek.setHours(0, 0, 0, 0);
  currentWeek.setDate(currentWeek.getDate() - ((currentWeek.getDay() + 6) % 7));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const weeksToShow = Array.from({ length: 12 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - ((11 - index) * 7));
    const key = dateKey(start);
    const source = dataByWeek.get(key) || {};
    return {
      date: key,
      visits: Math.max(0, Number(source.visits) || 0),
      clicks: Math.max(0, Number(source.linkClicks ?? source.link_clicks) || 0)
    };
  });

  const peakDay = weeksToShow.reduce((peak, week) =>
    week.visits + week.clicks >= peak.visits + peak.clicks ? week : peak
  );
  const peakCaption = document.getElementById('analyticsPeakDate');
  if (peakCaption && weeksToShow.some(week => week.visits || week.clicks)) {
    const date = new Date(`${peakDay.date}T00:00:00`);
    const label = Number.isNaN(date.getTime()) ? peakDay.date : date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
    peakCaption.innerHTML = `
    <div class="inline-flex flex-col gap-1 text-sm leading-snug">
  <span class="text-xs font-medium uppercase tracking-wider opacity-60">Peak week:</span>
  <strong class="font-semibold">${escapeHtml_(label)}</strong>
  <div class="flex items-center gap-1.5 opacity-85">
    <span class="opacity-50">•</span>
    <span><strong class="font-semibold tabular-nums">${format(peakDay.visits)}</strong> visits</span>
  </div>
  <div class="flex items-center gap-1.5 opacity-85">
    <span class="opacity-50">•</span>
    <span><strong class="font-semibold tabular-nums">${format(peakDay.clicks)}</strong> clicks</span>
  </div>
</div>
`;
  } else if (peakCaption) {
    peakCaption.textContent = '';
  }

  const width = 360;
  const height = 156;
  const left = 32;
  const right = 8;
  const top = 10;
  const bottom = 128;
  const xStep = (width - left - right) / (weeksToShow.length - 1);
  const peak = Math.max(1, ...weeksToShow.flatMap(week => [week.visits, week.clicks]));
  const yFor = value => bottom - ((value / peak) * (bottom - top));
  const visitPoints = weeksToShow.map((week, index) => ({ x: left + xStep * index, y: yFor(week.visits), week, index }));
  const clickPoints = weeksToShow.map((week, index) => ({ x: left + xStep * index, y: yFor(week.clicks), week, index }));
  const pathFor = points => points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const areaFor = points => `${pathFor(points)} L${points[points.length - 1].x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`;
  const guides = [0, 0.5, 1].map(ratio => {
    const y = bottom - ratio * (bottom - top);
    return `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="currentColor" stroke-opacity=".12" stroke-dasharray="3 5" />`;
  }).join('');
  const dateLabel = week => {
    const date = new Date(`${week.date}T00:00:00`);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en', { day: 'numeric', month: 'short' });
  };
  const labelIndices = new Set([0, 3, 6, 9, 11]);
  const labels = weeksToShow.map((week, index) => {
    if (!labelIndices.has(index)) return '';
    const x = left + xStep * index;
    const anchor = index === 0 ? 'start' : index === weeksToShow.length - 1 ? 'end' : 'middle';
    return `<text x="${x.toFixed(1)}" y="150" text-anchor="${anchor}" fill="currentColor" fill-opacity=".6" font-size="10">${escapeHtml_(dateLabel(week))}</text>`;
  }).join('');
  const pointsFor = (points, color, series) => points.map(point => {
    const value = series === 'visits' ? point.week.visits : point.week.clicks;
    const title = `${dateLabel(point.week)}: ${format(value)} ${series === 'visits' ? 'visits' : 'link clicks'}`;
    return `<g class="analytics-chart-point" data-day-index="${point.index}" data-series="${series}" role="button" tabindex="0" aria-pressed="false" aria-describedby="analyticsChartTooltip" aria-label="${escapeHtml_(title)}"><circle class="analytics-chart-hit" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="8" fill="#fff" fill-opacity=".01"/><circle class="analytics-chart-dot" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="3.5" fill="${color}"/></g>`;
  }).join('');

  chart.innerHTML = `<div class="analytics-chart-stage relative w-full"><svg class="block h-36 w-full overflow-visible text-slate-400 sm:h-44" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="group" aria-label="Weekly activity. Focus or point to a node for details.">
    <defs><linearGradient id="analyticsVisitFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity=".22"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/></linearGradient></defs>
    ${guides}
    <path d="${areaFor(visitPoints)}" fill="url(#analyticsVisitFill)" />
    <path d="${pathFor(visitPoints)}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="${pathFor(clickPoints)}" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${pointsFor(visitPoints, '#38bdf8', 'visits')}
    ${pointsFor(clickPoints, '#34d399', 'clicks')}
    ${labels}
  </svg><div id="analyticsChartTooltip" class="analytics-chart-tooltip" role="tooltip" hidden></div></div>`;
  bindActivityPointInteractions_(chart, weeksToShow, width, height, format, dateLabel);
}

function bindActivityPointInteractions_(chart, days, viewWidth, viewHeight, format, dateLabel) {
  const stage = chart.querySelector('.analytics-chart-stage');
  const svg = stage?.querySelector('svg');
  const tooltip = stage?.querySelector('.analytics-chart-tooltip');
  const points = [...(stage?.querySelectorAll('.analytics-chart-point') || [])];
  if (!stage || !svg || !tooltip || !points.length) return;

  let pinnedPoint = null;
  let hoveredPoint = null;
  const hideTooltip = () => {
    tooltip.hidden = true;
    points.forEach(point => {
      point.classList.remove('is-selected');
      point.setAttribute('aria-pressed', 'false');
    });
    pinnedPoint = null;
  };

  const showTooltip = (point, pin = false) => {
    const day = days[Number(point.dataset.dayIndex)];
    const circle = point.querySelector('.analytics-chart-dot');
    if (!day || !circle) return;

    tooltip.innerHTML = `<span class="analytics-tooltip-date">${escapeHtml_(dateLabel(day))}</span><span><i class="analytics-tooltip-visits"></i>${format(day.visits)} visits</span><span><i class="analytics-tooltip-clicks"></i>${format(day.clicks)} clicks</span>`;
    tooltip.hidden = false;
    const stageRect = stage.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const x = Number(circle.getAttribute('cx'));
    const y = Number(circle.getAttribute('cy'));
    const centerX = (svgRect.left - stageRect.left) + (x / viewWidth) * svgRect.width;
    const centerY = (svgRect.top - stageRect.top) + (y / viewHeight) * svgRect.height;
    const halfTooltip = Math.min(tooltip.offsetWidth / 2, stageRect.width / 2 - 4);
    const left = Math.max(halfTooltip + 4, Math.min(stageRect.width - halfTooltip - 4, centerX));

    tooltip.style.left = `${left}px`;
    const placeBelow = centerY < tooltip.offsetHeight + 18;
    tooltip.style.top = `${placeBelow ? centerY + 10 : centerY - 8}px`;
    tooltip.classList.toggle('is-below-point', placeBelow);
    points.forEach(item => {
      const selected = item === point;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected && pin));
    });
    pinnedPoint = pin ? point : null;
  };

  points.forEach(point => {
    point.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && !pinnedPoint) {
        hoveredPoint = point;
        showTooltip(point);
      }
    });
    point.addEventListener('pointerleave', event => {
      if (event.pointerType !== 'touch' && hoveredPoint === point) {
        hoveredPoint = null;
        if (!pinnedPoint) hideTooltip();
      }
    });
    point.addEventListener('focus', () => showTooltip(point));
    point.addEventListener('blur', () => {
      if (!pinnedPoint) hideTooltip();
    });
    point.addEventListener('click', event => {
      event.stopPropagation();
      if (pinnedPoint === point) hideTooltip();
      else showTooltip(point, true);
    });
    point.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (pinnedPoint === point) hideTooltip();
        else showTooltip(point, true);
      } else if (event.key === 'Escape') {
        hideTooltip();
      }
    });
  });

  stage.addEventListener('click', event => {
    if (!event.target.closest('.analytics-chart-point')) hideTooltip();
  });

  if (window.matchMedia?.('(hover: none), (pointer: coarse)').matches) {
    const candidates = points.filter(point => {
      const day = days[Number(point.dataset.dayIndex)];
      return day && (day.visits > 0 || day.clicks > 0);
    });
    if (candidates.length) showTooltip(candidates[Math.floor(Math.random() * candidates.length)], true);
  }
}
function escapeHtml_(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
