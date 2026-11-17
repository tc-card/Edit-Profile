const STANDARD_CONFIG_ = {
  SPREADSHEET_ID: '1tvVAN9sQ4yNPV0om2RKb8EiejoYn8eytTOEi9k26g0E',
  FORM_SHEET: 'Form',
  ANALYTICS_SHEET: 'Analytics',
  DUPLICATE_CACHE_KEY: 'standard_signup_duplicates_v1',
  DUPLICATE_CACHE_SECONDS: 60,
  PROFILE_DOMAIN: 'https://my.tccards.tn'
};

const STANDARD_FORM_HEADERS_ = [
  'Timestamp', 'Name', 'Email', 'Link', 'Tagline', 'Phone', 'Address',
  'Social Links', 'Selected Style', 'Profile Picture URL', 'Referral Code',
  'ID', 'Status', 'Email Preference', 'Analytics ID'
];

const STANDARD_ANALYTICS_HEADERS_ = [
  'Timestamp', 'Analytics ID', 'Event Type', 'Details'
];

/**
 * Run once in the Standard signup Apps Script project to create both tabs,
 * add their headers, and authorize Spreadsheet and Mail access.
 */
function setupStandardSheets() {
  ensureStandardSheets_();
  MailApp.getRemainingDailyQuota();
  return {
    status: 'success',
    sheets: [STANDARD_CONFIG_.FORM_SHEET, STANDARD_CONFIG_.ANALYTICS_SHEET]
  };
}

function seedStandardAnalyticsMockData() {
  const spreadsheet = SpreadsheetApp.openById(STANDARD_CONFIG_.SPREADSHEET_ID);
  const form = spreadsheet.getSheetByName(STANDARD_CONFIG_.FORM_SHEET);
  let analytics = spreadsheet.getSheetByName(STANDARD_CONFIG_.ANALYTICS_SHEET);

  if (!form) throw new Error('Form sheet not found. Run setupStandardSheets() first.');
  if (!analytics) analytics = spreadsheet.insertSheet(STANDARD_CONFIG_.ANALYTICS_SHEET);

  const formBaseHeaders = [
    'Timestamp', 'Name', 'Email', 'Link', 'Tagline', 'Phone', 'Address',
    'Social Links', 'Selected Style', 'Profile Picture URL', 'Referral Code',
    'ID', 'Status', 'Email Preference'
  ];

  if (form.getLastRow() === 0) {
    form.getRange(1, 1, 1, 15)
      .setValues([[...formBaseHeaders, 'Analytics ID']]);
  } else {
    const current = form.getRange(1, 1, 1, Math.max(form.getLastColumn(), 15))
      .getDisplayValues()[0]
      .map(value => String(value).trim());

    const baseMatches = formBaseHeaders.every((header, index) => current[index] === header);
    if (!baseMatches) {
      throw new Error('Form headers differ from the expected Standard layout; no data was changed.');
    }

    if (!current.includes('Analytics ID')) {
      form.getRange(1, 15).setValue('Analytics ID');
    }
  }

  if (analytics.getLastRow() === 0) {
    analytics.getRange(1, 1, 1, 4)
      .setValues([['Timestamp', 'Analytics ID', 'Event Type', 'Details']]);
  }

  const formHeaders = form.getRange(1, 1, 1, form.getLastColumn())
    .getDisplayValues()[0].map(value => String(value).trim());
  const analyticsHeaders = analytics.getRange(1, 1, 1, analytics.getLastColumn())
    .getDisplayValues()[0].map(value => String(value).trim());

  const formCol = name => formHeaders.indexOf(name) + 1;
  const analyticsCol = name => analyticsHeaders.indexOf(name);

  const requiredForm = ['Email', 'Link', 'ID', 'Analytics ID'];
  if (requiredForm.some(name => formCol(name) === 0)) {
    throw new Error('Form must include Email, Link, ID, and Analytics ID headers.');
  }

  const analyticsIdCol = analyticsCol('Analytics ID') >= 0
    ? analyticsCol('Analytics ID')
    : analyticsCol('Profile ID'); // Accept an existing tab using the earlier header.

  if (
    analyticsCol('Timestamp') < 0 ||
    analyticsIdCol < 0 ||
    analyticsCol('Event Type') < 0 ||
    analyticsCol('Details') < 0
  ) {
    throw new Error('Analytics needs Timestamp, Analytics ID, Event Type, and Details headers.');
  }

  const profiles = [
    {
      name: 'Ali Cheikh',
      email: 'contact@alicheikh.tn',
      link: 'Ali',
      tagline: 'Full-Stack Developer & SysAdmin crafting beautiful, automated management tools, scalable AI infra, functional software😉',
      phone: '+216 907 254 34',
      address: '',
      socials: [
        'https://AliCheikh.tn',
        'https://cal.com/ali-cheikh/',
        'https://linkedin.com/in/ali-cheikh',
        'https://github.com/Ali-Cheikh',
        'https://discordapp.com/users/679042699277369365',
        'https://instagram.com/ali.commits'
      ].join('\n'),
      style: "url('https://res.cloudinary.com/duf.../hgfsx2swmqpc11xffzfa.jpg')/dark|t=poster|a=#d9a84d|cb=20|bb=0|co=30",
      profilePic: 'https://res.cloudinary.com/dufg7fm4stt/image/upload/v1792272267/kazv6rarlkhrvksxy8aw.jpg',
      referral: 'WE10T',
      id: '601be47f-1563-1748-690a-4e5f60718293',
      linkDomain: 'linkedin.com'
    },
    {
      name: 'Mourad Znidi',
      email: 'znidimourad26@gmail.com',
      link: 'Keeto',
      tagline: 'Software Developer & AI Enthusiast',
      phone: '28299499',
      address: '',
      socials: [
        'https://www.linkedin.com/in/mourad-znidi-166349389/',
        'https://www.facebook.com/mourad.znaidi.5',
        'https://github.com/Keeto1',
        'https://mouradznidi.vercel.app/'
      ].join('\n'),
      style: 'linear-gradient(225deg, #520000, #0c0904, #070303)|t=poster|a=#660000|cb=30|co=45',
      profilePic: 'https://res.cloudinary.com/dufg7fm4stt/image/upload/v1793988720/albrxxw1vd0z85ur2w94.jpg',
      referral: '',
      id: 'facee363-0c32-486c-8e2e-340a445c68de',
      linkDomain: 'github.com'
    },
    {
      name: 'Oussema Bennour',
      email: 'bennouroussema0@gmail.com',
      link: 'Oussemabennour',
      tagline: 'Entrepreneur - founder @eejar',
      phone: '21628257446',
      address: 'Tunis, Tunisia',
      socials: [
        'https://eejar.tn',
        'https://www.linkedin.com/in/oussema-bennour-55b090130?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app',
        'https://www.instagram.com/realest_estate_tn',
        'https://www.instagram.com/eejar.tn'
      ].join('\n'),
      style: 'corporateGradient',
      profilePic: 'https://res.cloudinary.com/dufg7fm4stt/image/upload/v1750283648/r2y03i0kunmjm1nzaiep.jpg',
      referral: 'WE10T',
      id: 'a77b633a-38f0-4b80-8b65-4caa2dd180f5',
      linkDomain: 'eejar.tn'
    }
  ];

  const eventPattern = [
    ['view', 28, {}],
    ['view', 14, {}],
    ['view', 5, {}],
    ['view', 1, {}],
    ['view', 0, {}],
    ['link_click', 3, { domain: '' }],
    ['contact_email', 2, {}],
    ['contact_phone', 1, {}],
    ['contact_location', 8, {}],
    ['share_click', 4, {}],
    ['copy_details', 2, {}],
    ['save_contact', 0, {}]
  ];

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Could not acquire the sheet lock.');

  try {
    const formData = form.getDataRange().getValues();
    const emailIndex = formCol('Email') - 1;
    const linkIndex = formCol('Link') - 1;
    const idIndex = formCol('ID') - 1;
    const analyticsIdIndex = formCol('Analytics ID') - 1;
    const rowsToAdd = [];
    const analyticsIdByEmail = {};

    profiles.forEach(profile => {
      const existingIndex = formData.findIndex((row, index) =>
        index > 0 &&
        String(row[emailIndex] || '').trim().toLowerCase() === profile.email.toLowerCase()
      );

      if (existingIndex >= 0) {
        const row = formData[existingIndex];
        const analyticsId = String(row[analyticsIdIndex] || row[idIndex] || profile.id);
        if (!row[analyticsIdIndex]) {
          form.getRange(existingIndex + 1, analyticsIdIndex + 1).setValue(analyticsId);
        }
        analyticsIdByEmail[profile.email] = analyticsId;
        return;
      }

      const linkConflict = formData.some((row, index) =>
        index > 0 &&
        String(row[linkIndex] || '').trim().toLowerCase() === profile.link.toLowerCase()
      );
      if (linkConflict) {
        throw new Error(`Profile link already exists in Standard Form: ${profile.link}`);
      }

      const analyticsId = profile.id;
      const values = {
        'Timestamp': new Date(),
        'Name': profile.name,
        'Email': profile.email,
        'Link': profile.link,
        'Tagline': profile.tagline,
        'Phone': profile.phone,
        'Address': profile.address,
        'Social Links': profile.socials,
        'Selected Style': profile.style,
        'Profile Picture URL': profile.profilePic,
        'Referral Code': profile.referral,
        'ID': profile.id,
        'Status': 'Active',
        'Email Preference': '',
        'Analytics ID': analyticsId
      };

      rowsToAdd.push(formHeaders.map(header => values[header] ?? ''));
      analyticsIdByEmail[profile.email] = analyticsId;
    });

    if (rowsToAdd.length) {
      form.getRange(form.getLastRow() + 1, 1, rowsToAdd.length, formHeaders.length)
        .setValues(rowsToAdd);
    }

    const detailsIndex = analyticsCol('Details');
    const existingSeedKeys = new Set();

    if (analytics.getLastRow() > 1) {
      analytics.getRange(2, 1, analytics.getLastRow() - 1, analytics.getLastColumn())
        .getValues()
        .forEach(row => {
          try {
            const details = JSON.parse(row[detailsIndex] || '{}');
            if (details.seedKey) existingSeedKeys.add(details.seedKey);
          } catch (_) {}
        });
    }

    const now = Date.now();
    const eventRows = [];

    profiles.forEach(profile => {
      eventPattern.forEach(([type, daysAgo, extra], index) => {
        const seedKey = `standard-demo-v1:${profile.link}:${index}`;
        if (existingSeedKeys.has(seedKey)) return;

        const details = {
          mock: true,
          seedKey,
          ...extra,
          ...(type === 'link_click' ? { domain: profile.linkDomain } : {})
        };

        const values = {
          'Timestamp': new Date(now - daysAgo * 86400000),
          'Analytics ID': analyticsIdByEmail[profile.email],
          'Profile ID': analyticsIdByEmail[profile.email],
          'Event Type': type,
          'Details': JSON.stringify(details)
        };

        eventRows.push(analyticsHeaders.map(header => values[header] ?? ''));
      });
    });

    if (eventRows.length) {
      analytics.getRange(analytics.getLastRow() + 1, 1, eventRows.length, analyticsHeaders.length)
        .setValues(eventRows);
    }

    CacheService.getScriptCache().remove(STANDARD_CONFIG_.DUPLICATE_CACHE_KEY);

    return {
      status: 'success',
      profilesAdded: rowsToAdd.length,
      analyticsEventsAdded: eventRows.length,
      message: 'Mock profile and analytics data seeded. No emails were sent.'
    };
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    ensureStandardSheets_();

    const params = e && e.parameter ? e.parameter : {};

    if (params.healthcheck) {
      return ContentService.createTextOutput('OK');
    }

    if (params.check_duplicates === 'true') {
      const result = checkDuplicates_(params.email, params.link, true);
      return jsonResponse_(result);
    }

    // Standard has no referral discounts or event codes.
    // This response keeps a copied Basic signup page from failing
    // if it still asks the endpoint to validate a referral code.
    if (params.check_referral === 'true') {
      return jsonResponse_({ codeExists: false, codeDetails: null });
    }

    if (params.get_stats === 'true') {
      return jsonResponse_(getSubmissionStats_());
    }

    if (params.get_all_links === 'true') {
      return jsonResponse_({ links: getExistingLinks_() });
    }

    if (params.name !== undefined || params.email !== undefined || params.link !== undefined) {
      return jsonResponse_(submitStandardSignup_(params));
    }

    throw new Error('Invalid request');
  } catch (error) {
    console.error('Standard signup GET error:', error);
    return jsonResponse_({ status: 'error', message: error.message || 'Request failed' });
  }
}

/**
 * Optional JSON POST support for the Standard signup page.
 */
function doPost(e) {
  try {
    ensureStandardSheets_();

    let params = (e && e.parameter) ? e.parameter : {};
    const body = e && e.postData && e.postData.contents;

    if (body) {
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          params = parsed;
        }
      } catch (_) {
        // Keep e.parameter for form-encoded POST requests.
      }
    }

    if (params.action === 'trackAnalytics') {
      return jsonResponse_(recordStandardAnalyticsEvent_(params));
    }

    return jsonResponse_(submitStandardSignup_(params));
  } catch (error) {
    console.error('Standard POST error:', error);
    return jsonResponse_({ status: 'error', message: error.message || 'Request failed' });
  }
}

function submitStandardSignup_(params) {
  const name = cleanText_(params.name);
  const email = cleanText_(params.email).toLowerCase();
  const link = cleanText_(params.link);

  if (!name || !email || !link) {
    throw new Error('Name, email, and link are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }
  if (!/^[a-zA-Z][a-zA-Z0-9-]{2,14}$/.test(link)) {
    throw new Error('The profile link must be 3–15 characters and start with a letter');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('Signup is busy. Please try again in a moment.');
  }

  let submissionId;
  try {
    // Always check the sheet directly before writing, so a stale cache
    // cannot allow a duplicate signup.
    const duplicates = checkDuplicates_(email, link, false);
    if (duplicates.emailExists) throw new Error('Email already exists');
    if (duplicates.linkExists) throw new Error('Link already exists');

    const sheet = getStandardSheet_(STANDARD_CONFIG_.FORM_SHEET);
    submissionId = Utilities.getUuid();

    const socialLinks = normalizeSocialLinks_(
      params.social_links !== undefined ? params.social_links : params.socialLinks
    );

    const address = cleanText_(params.address);
    const phone = cleanText_(params.phone);
    const profilePic = cleanText_(
      params.profilePic ||
      params.profile_picture ||
      params.profilePicture ||
      params['Profile Picture URL'] ||
      ''
    );

    const row = [
      new Date(),
      safeSheetText_(name),
      safeSheetText_(email),
      safeSheetText_(link),
      safeSheetText_(params.tagline),
      safeSheetText_(phone),
      safeSheetText_(address),
      safeSheetText_(socialLinks),
      safeSheetText_(params.style || params.selectedStyle || 'default'),
      safeSheetText_(profilePic),
      '', // Referral Code is retained as a column, but unused on Standard.
      submissionId,
      'Inactive',
      '', // Email Preference
      submissionId // Analytics ID; links this profile to its event rows.
    ];

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, STANDARD_FORM_HEADERS_.length)
      .setValues([row]);

    CacheService.getScriptCache().remove(STANDARD_CONFIG_.DUPLICATE_CACHE_KEY);
  } finally {
    lock.releaseLock();
  }

  const emailSent = sendStandardConfirmationEmail_({
    email,
    name,
    link,
    address,
    phone,
    profilePic
  });

  return {
    status: 'success',
    message: 'Standard signup received',
    submissionId,
    emailSent
  };
}

function recordStandardAnalyticsEvent_(params) {
  const allowedEvents = new Set([
    'view', 'link_click', 'contact_email', 'contact_phone',
    'contact_location', 'share_click', 'copy_details', 'save_contact'
  ]);
  const analyticsId = cleanText_(params.analyticsId);
  const eventType = cleanText_(params.eventType).toLowerCase();
  if (!analyticsId || !allowedEvents.has(eventType)) {
    throw new Error('Invalid analytics event');
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Analytics is busy.');

  try {
    const form = getStandardSheet_(STANDARD_CONFIG_.FORM_SHEET);
    const formHeaders = form.getRange(1, 1, 1, form.getLastColumn())
      .getDisplayValues()[0].map(value => String(value).trim());
    const analyticsIdCol = formHeaders.indexOf('Analytics ID');
    const idCol = formHeaders.indexOf('ID');
    const statusCol = formHeaders.indexOf('Status');
    if (analyticsIdCol < 0 && idCol < 0) {
      throw new Error('Form is missing an Analytics ID or ID column');
    }

    const profile = form.getDataRange().getValues().slice(1).find(row => {
      const rowId = String(
        (analyticsIdCol >= 0 && row[analyticsIdCol]) ||
        (idCol >= 0 && row[idCol]) || ''
      ).trim();
      return rowId === analyticsId;
    });
    if (!profile || (statusCol >= 0 &&
        String(profile[statusCol] || '').trim().toLowerCase() !== 'active')) {
      throw new Error('Analytics profile not found or inactive');
    }

    const details = {};
    if (eventType === 'link_click') {
      const input = params.details && typeof params.details === 'object'
        ? params.details
        : {};
      const raw = cleanText_(input.domain || input.url);
      const domain = raw.replace(/^https?:\/\//i, '')
        .split(/[/?#]/)[0].toLowerCase().replace(/^www\./, '');
      if (!domain || !/^[a-z0-9.-]+$/.test(domain)) {
        throw new Error('Invalid link domain');
      }
      details.domain = domain;
    }

    const analytics = getStandardSheet_(STANDARD_CONFIG_.ANALYTICS_SHEET);
    const headers = analytics.getRange(1, 1, 1, analytics.getLastColumn())
      .getDisplayValues()[0].map(value => String(value).trim());
    const idHeader = headers.includes('Analytics ID') ? 'Analytics ID' : 'Profile ID';
    if (!headers.includes('Timestamp') || !headers.includes(idHeader) ||
        !headers.includes('Event Type') || !headers.includes('Details')) {
      throw new Error('Analytics sheet headers do not match the expected layout');
    }

    const record = {
      Timestamp: new Date(),
      [idHeader]: analyticsId,
      'Event Type': eventType,
      Details: JSON.stringify(details)
    };
    analytics.appendRow(headers.map(header =>
      Object.prototype.hasOwnProperty.call(record, header) ? record[header] : ''
    ));

    return { status: 'success' };
  } finally {
    lock.releaseLock();
  }
}

function checkDuplicates_(email, link, useCache) {
  const normalizedEmail = cleanText_(email).toLowerCase();
  const normalizedLink = cleanText_(link).toLowerCase();
  const cache = CacheService.getScriptCache();

  let rows = null;
  if (useCache) {
    const cached = cache.get(STANDARD_CONFIG_.DUPLICATE_CACHE_KEY);
    if (cached) {
      try {
        rows = JSON.parse(cached);
      } catch (_) {
        cache.remove(STANDARD_CONFIG_.DUPLICATE_CACHE_KEY);
      }
    }
  }

  if (!Array.isArray(rows)) {
    const sheet = getStandardSheet_(STANDARD_CONFIG_.FORM_SHEET);
    const count = Math.max(0, sheet.getLastRow() - 1);
    rows = count
      ? sheet.getRange(2, 3, count, 2).getDisplayValues()
      : [];

    if (useCache) {
      cache.put(
        STANDARD_CONFIG_.DUPLICATE_CACHE_KEY,
        JSON.stringify(rows),
        STANDARD_CONFIG_.DUPLICATE_CACHE_SECONDS
      );
    }
  }

  return {
    emailExists: !!normalizedEmail && rows.some(row =>
      String(row[0] || '').trim().toLowerCase() === normalizedEmail
    ),
    linkExists: !!normalizedLink && rows.some(row =>
      String(row[1] || '').trim().toLowerCase() === normalizedLink
    )
  };
}

function getSubmissionStats_() {
  const sheet = getStandardSheet_(STANDARD_CONFIG_.FORM_SHEET);
  const count = Math.max(0, sheet.getLastRow() - 1);
  if (!count) return { totalCount: 0, monthlyGrowth: 0 };

  const values = sheet.getRange(2, 1, count, 1).getValues();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthlyGrowth = values.reduce((total, [value]) => {
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime()) && date >= monthStart && date < nextMonth
      ? total + 1
      : total;
  }, 0);

  return { totalCount: count, monthlyGrowth };
}

function getExistingLinks_() {
  const sheet = getStandardSheet_(STANDARD_CONFIG_.FORM_SHEET);
  const count = Math.max(0, sheet.getLastRow() - 1);
  if (!count) return [];

  return sheet.getRange(2, 4, count, 1)
    .getDisplayValues()
    .flat()
    .map(value => String(value).trim())
    .filter(Boolean);
}

function sendStandardConfirmationEmail_(options) {
  const opts = options || {};
  const email = cleanText_(opts.email);
  const name = cleanText_(opts.name);
  const link = cleanText_(opts.link);
  const address = cleanText_(opts.address);
  const phone = cleanText_(opts.phone);
  const profilePicRaw = cleanText_(opts.profilePic);

  const profileUrl = `${STANDARD_CONFIG_.PROFILE_DOMAIN}/@${encodeURIComponent(link)}`;
  const safeName = name ? String(name).trim() : 'Valued Customer';
  const safeAddress = address ? String(address).trim() : 'The address you provided on your card';
  const safePhone = phone ? String(phone).trim() : 'The number you provided';
  const currentYear = new Date().getFullYear();

  // Only allow absolute http(s) URLs for the optional avatar.
  const profilePic = /^https?:\/\/\S+$/i.test(profilePicRaw) ? profilePicRaw : '';

  // Escaped copies used inside the HTML template only.
  const nameHtml = escapeHtml_(safeName);
  const addressHtml = escapeHtml_(safeAddress);
  const phoneHtml = escapeHtml_(safePhone);
  const linkHtml = escapeHtml_(link);
  const profileUrlHtml = escapeHtml_(profileUrl);
  const profilePicHtml = escapeHtml_(profilePic);

  // Plain-text alternative (required alongside htmlBody).
  const plainBody = [
    `Order received, ${safeName}!`,
    '',
    "Thanks for your order — we've received it. Our team will reach out to you soon to confirm the details with you.",
    '',
    'Here are the details we have on file:',
    `  Name: ${safeName}`,
    `  Digital Card: ${profileUrl}`,
    `  Shipping Address: ${safeAddress}`,
    `  Phone: ${safePhone}`,
    '',
    "You don't need to do anything right now. We'll confirm your order with you before anything ships.",
    '',
    'Need help? If you have any questions about this order, reply to this email or contact us at info@tccards.tn.',
    '',
    `© ${currentYear} tccards.tn. All rights reserved.`,
    'This is an automated message, please do not reply to this email.'
  ].join('\n');

  try {
    MailApp.sendEmail({
      to: email,
      subject: `Order received, ${safeName}!`,
      name: 'tccards.tn',
      replyTo: 'info@tccards.tn',
      body: plainBody,
      htmlBody: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Order Received</title>
<style>
p { color: #171717 !important; font-size: 14px !important; line-height: 24px !important; margin: 0 0 16px 0 !important; }
h1 { color: #171717 !important; font-size: 24px !important; line-height: 32px !important; font-weight: 600 !important; letter-spacing: -0.02em !important; margin: 0 0 24px 0 !important; padding: 0 !important; }
a { color: #0067D6 !important; text-decoration: none !important; }
strong { color: #171717 !important; font-weight: 600 !important; }
hr { border-top: 1px solid #E6E6E6 !important; border-bottom: none !important; border-left: none !important; border-right: none !important; }
.footer-text { color: #7D7D7D !important; font-size: 12px !important; line-height: 1.5 !important; margin: 0 0 8px 0 !important; }
.footer-text a { color: #7D7D7D !important; text-decoration: underline !important; font-weight: 400 !important; }
.brand-logo { display: block; filter: invert(0); }
.detail-label { color: #7D7D7D !important; font-size: 13px !important; line-height: 20px !important; }
.detail-value { color: #171717 !important; font-size: 14px !important; line-height: 20px !important; }
.btn-link { color: #ffffff !important; text-decoration: none !important; }

@media (prefers-color-scheme: dark) {
  html, body { background-color: #0A0A0A !important; }
  body, p, td, th, span { color: #ededed !important; }
  h1, strong { color: #ffffff !important; }
  a { color: #4da3ff !important; }
  .footer-text, .footer-text p { color: #7D7D7D !important; }
  .footer-text a { color: #7D7D7D !important; }
  hr { border-top-color: #333333 !important; }
    .brand-logo { display: block; filter: invert(0); background-color: 50% transparent; border-radius: 25px; background-color: black; }
  .tccards-details-block { background-color: #1F1F1F !important; color: #ffffff !important; }
  .detail-label { color: #8F8F8F !important; }
  .detail-value { color: #EDEDED !important; }
  .btn-link { color: #ffffff !important; }
}
</style>
</head>
<body style="background-color:#ffffff; margin:0; padding:0;">

<table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100% !important;">
  <tr>
    <td align="center">
      <table style="margin:40px 0;" width="600" border="0" cellspacing="0" cellpadding="40">
        <tr>
          <td align="center">
            <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; text-align:left; width:465px;">

              <div style="margin-bottom:48px">
                <img src="https://edit.tccards.tn/Assets/images/logo.png" width="24" height="21" alt="tccards.tn" class="brand-logo">
              </div>

              ${profilePicHtml ? `<div style="margin-bottom:24px"><img src="${profilePicHtml}" width="48" height="48" alt="${nameHtml}" style="display:block; border-radius:50%; object-fit:cover;"></div>` : ''}

              <h1>Order received, <strong>${nameHtml}</strong>!</h1>
              <p>Thanks for your order — we've received it. Our team will reach out to you soon to confirm the details with you.</p>
              <p>Here are the details we have on file:</p>

              <!-- Details Block -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100% !important; margin:24px 0;">
                <tr>
                  <td bgcolor="#F2F2F2" class="tccards-details-block" style="border-radius:8px; padding:20px 24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100% !important;">
                      <tr>
                        <td class="detail-label" width="140" style="padding:8px 0; vertical-align:top;">Name</td>
                        <td class="detail-value" style="padding:8px 0; vertical-align:top;">${nameHtml}</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:8px 0; vertical-align:top;">Digital Card</td>
                        <td class="detail-value" style="padding:8px 0; vertical-align:top; word-break:break-all;">
                          <a href="${profileUrlHtml}" target="_blank">my.tccards.tn/@${linkHtml}</a>
                        </td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:8px 0; vertical-align:top;">Shipping Address</td>
                        <td class="detail-value" style="padding:8px 0; vertical-align:top;">${addressHtml}</td>
                      </tr>
                      <tr>
                        <td class="detail-label" style="padding:8px 0; vertical-align:top;">Phone</td>
                        <td class="detail-value" style="padding:8px 0; vertical-align:top;">${phoneHtml}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p>You don't need to do anything right now. We'll confirm your order with you before anything ships.</p>

              <!-- Button -->
              <!--<table border="0" cellspacing="0" cellpadding="0" style="margin:8px 0 0 0;">-->
              <!--  <tr>-->
              <!--    <td align="center" bgcolor="#0067D6" style="border-radius:6px;">-->
              <!--      <a href="${profileUrlHtml}" target="_blank" class="btn-link" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; line-height:20px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">View My Digital Card</a>-->
              <!--    </td>-->
              <!--  </tr>-->
              <!--</table>-->

              <hr style="margin:44px 0 32px 0; width:100%;">

              <!-- Footer -->
              <p class="footer-text" style="margin-bottom: 20px;">
                <strong>Need help?</strong> If you have any questions about this order, reply to this email or contact us at <a href="mailto:info@tccards.tn">info@tccards.tn</a>.
              </p>

              <p class="footer-text">
                &copy; ${currentYear} <a href="https://tccards.tn" target="_blank">tccards.tn</a>. All rights reserved.<br>
                This is an automated message, please do not reply to this email.
              </p>

            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</body>
</html>`
    });
    return true;
  } catch (error) {
    console.error('Standard confirmation email failed:', error);
    return false;
  }
}

function ensureStandardSheets_() {
  const spreadsheet = SpreadsheetApp.openById(STANDARD_CONFIG_.SPREADSHEET_ID);
  ensureSheetHeaders_(spreadsheet, STANDARD_CONFIG_.FORM_SHEET, STANDARD_FORM_HEADERS_);
  ensureSheetHeaders_(spreadsheet, STANDARD_CONFIG_.ANALYTICS_SHEET, STANDARD_ANALYTICS_HEADERS_);
}

function ensureSheetHeaders_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length)
    .getDisplayValues()[0]
    .map(value => String(value).trim());

  if (current.every(value => !value)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  const matches = headers.every((header, index) => {
    if (current[index] === header) return true;
    return sheetName === STANDARD_CONFIG_.ANALYTICS_SHEET &&
      header === 'Analytics ID' && current[index] === 'Profile ID';
  });
  if (!matches) {
    throw new Error(
      `The "${sheetName}" sheet already has different headers. ` +
      'No existing data was changed.'
    );
  }
}

function getStandardSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(STANDARD_CONFIG_.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  return sheet;
}

function normalizeSocialLinks_(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText_).filter(Boolean).join('\n');
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .join('\n');
}

function cleanText_(value) {
  return String(value == null ? '' : value).trim();
}

function safeSheetText_(value) {
  const text = cleanText_(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
