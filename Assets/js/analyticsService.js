// analyticsService.js
import { CONFIG, state } from './config.js';

export async function fetchAnalyticsData(profileLink) {
  if (!profileLink) {
    return {
      totalVisits: 0,
      totalClicks: 0,
      shares: 0,
      copiedDetails: 0,
      links: {}
    };
  }

  try {
    const url = `${CONFIG.googleAnalyticsUrl}?link=${encodeURIComponent(profileLink)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return {
      totalVisits: 0,
      totalClicks: 0,
      shares: 0,
      copiedDetails: 0,
      links: {}
    };
  }
}

export function transformAnalyticsData(analytics, profileData) {
  const userLinks = profileData?.socialLinks || [];
  
  const linkPerformance = Object.entries(analytics.links || {}).map(([key, clicks]) => {
    const linkIndex = parseInt(key) - 1;
    const url = userLinks[linkIndex];
    
    return {
      url,
      label: url ? new URL(url).hostname.replace('www.', '') : `Link ${key}`,
      clicks: clicks || 0,
      icon: getLinkIcon(url)
    };
  }).sort((a, b) => b.clicks - a.clicks);

  return {
    summary: {
      totalVisits: analytics.totalvisits || 0,
      totalClicks: analytics.totalclicks || 0,
      shares: analytics.shares || 0,
      copiedDetails: analytics.copieddetails || 0
    },
    linkPerformance: linkPerformance.length > 0 ? linkPerformance : [
      { url: null, label: 'No link data', clicks: 0, icon: 'fas fa-unlink' }
    ]
  };
}