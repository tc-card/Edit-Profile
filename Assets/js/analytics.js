import { state, DOM } from './config.js';
import { getLinkIcon } from './utils.js';
import { fetchAnalyticsData, transformAnalyticsData } from './analyticsService.js';

const CHART_COLORS = {
  purple: '#8b5cf6',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  pink: '#ec4899',
  darkBg: '#1a202c',
  lightText: '#e2e8f0',
  mediumText: '#a0aec0'
};

function renderStatCard(title, value, icon, color) {
  return `
    <div class="bg-gray-800 rounded-xl p-4 shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-400">${title}</p>
          <h3 class="text-2xl font-bold text-${color}-400">${value}</h3>
        </div>
        <div class="p-2 bg-${color}-600/20 rounded-lg">
          <i class="fas fa-${icon} text-${color}-400"></i>
        </div>
      </div>
    </div>
  `;
}
export async function renderAnalyticsPage() {
  // Clear previous content while loading
  DOM.profileEditor.innerHTML = `
    <div class="flex justify-center items-center h-64">
      <i class="fas fa-spinner fa-spin text-3xl text-purple-400"></i>
    </div>
  `;

  try {
    // Fetch fresh analytics data
    const rawAnalytics = await fetchAnalyticsData(state.profileData?.link);
    const analyticsData = transformAnalyticsData(rawAnalytics, state.profileData);
    
    // Render the page with the new data
    DOM.profileEditor.innerHTML = `
    <div class="flex flex-col md:flex-row md:items-center gap-6 mb-8 p-4 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/30">
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-purple-400">Link Analytics</h1>
        <p class="text-gray-300">Performance of your profile links</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-center p-3 bg-gray-700 rounded-lg">
          <p class="text-sm text-gray-400">Card ID</p>
          <p class="text-purple-400 font-medium">${state.profileData.status || 'N/A'}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Summary Stats -->
      <div class="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        ${renderStatCard('Total Visits', analyticsData.summary.totalVisits, 'eye', 'purple')}
        ${renderStatCard('Total Clicks', analyticsData.summary.totalClicks, 'mouse-pointer', 'blue')}
        ${renderStatCard('Shares', analyticsData.summary.shares, 'share', 'green')}
        ${renderStatCard('Copied', analyticsData.summary.copiedDetails, 'copy', 'yellow')}
      </div>

      <!-- Links Chart -->
      <div class="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Link Click Distribution</h2>
        <div class="h-96">
          <canvas id="linksChart"></canvas>
        </div>
      </div>

      <!-- Link Performance Table -->
      <div class="lg:col-span-2 bg-gray-800 rounded-xl p-6 shadow-lg">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Detailed Link Performance</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="text-left text-gray-400 border-b border-gray-700">
                <th class="pb-2">#</th>
                <th class="pb-2">Link</th>
                <th class="pb-2 text-right">Clicks</th>
                <th class="pb-2 text-right">% of Total</th>
                <th class="pb-2 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              ${analyticsData.linkPerformance.map((link, index) => `
                <tr class="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td class="py-3 font-mono">${index + 1}</td>
                  <td class="py-3">
                    <div class="flex items-center gap-2">
                      <i class="${link.icon} text-blue-400"></i>
                      <a href="${link.url || '#'}" target="_blank" class="text-blue-400 hover:underline truncate max-w-xs block">
                        ${link.label}
                      </a>
                    </div>
                  </td>
                  <td class="py-3 text-right font-mono">${link.clicks}</td>
                  <td class="py-3 text-right font-mono">
                    ${((link.clicks / analyticsData.summary.totalClicks) * 100).toFixed(1)}%
                  </td>
                  <td class="py-3 text-right font-mono">
                    ${((link.clicks / analyticsData.summary.totalVisits) * 100).toFixed(1)}%
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

    initCharts(analyticsData);
  } catch (error) {
    console.error('Error rendering analytics:', error);
    DOM.profileEditor.innerHTML = `
      <div class="bg-red-900/20 rounded-xl p-6 text-center">
        <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
        <h2 class="text-xl font-semibold text-red-400">Failed to load analytics</h2>
        <p class="text-gray-300 mt-2">${error.message || 'Unknown error occurred'}</p>
        <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg">
          Retry
        </button>
      </div>
    `;
  }
}

function initCharts(analyticsData) {
  // Links Chart (Horizontal Bar)
  const linksCtx = document.getElementById('linksChart').getContext('2d');
  new Chart(linksCtx, {
    type: 'bar',
    data: {
      labels: analyticsData.linkPerformance.map(link => link.label),
      datasets: [{
        label: 'Clicks',
        data: analyticsData.linkPerformance.map(link => link.clicks),
        backgroundColor: [
          CHART_COLORS.purple,
          CHART_COLORS.blue,
          CHART_COLORS.green,
          CHART_COLORS.yellow,
          CHART_COLORS.pink
        ],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.darkBg,
          titleColor: CHART_COLORS.lightText,
          bodyColor: CHART_COLORS.lightText,
          borderColor: CHART_COLORS.mediumText,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: hexToRgba(CHART_COLORS.mediumText, 0.2) },
          ticks: { color: CHART_COLORS.mediumText }
        },
        y: {
          grid: { color: hexToRgba(CHART_COLORS.mediumText, 0.2) },
          ticks: { color: CHART_COLORS.lightText }
        }
      }
    }
  });
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}