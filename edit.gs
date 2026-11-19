/* Profile Editor */
const STYLE_TOKENS_ = '(?:\\|(?:t=[a-z]+|a=#[0-9a-f]{3,8}|cb=\\d{1,2}|bb=\\d{1,2}|co=\\d{1,3}))*';
const STYLE_RE_ = new RegExp('^(?:linear-gradient\\([^|]*\\)(?:\\/(?:dark|light))?|url\\([\'"]?https?:\\/\\/[^\\s|]+[\'"]?\\)\\/(?:dark|light))' + STYLE_TOKENS_ + '$', 'i');

function doGet(e) {
  try {
    throw new Error('INVALID_ACTION');
  } catch (error) {
    return typeof formatResponse === 'function'
      ? formatResponse({ status: 'error', message: sanitizeErrorMessage(String(error.message || error)) })
      : jsonResponse({ status: 'error', message: String(error.message || error) });
  }
}

function doPost(e) {
  try {
    if (!e?.postData?.contents) throw new Error('NO_PAYLOAD');
    if (e.postData.contents.length > 100000) throw new Error('PAYLOAD_TOO_LARGE');
    let body = JSON.parse(e.postData.contents);
    if (body.data && typeof body.data === 'string') {
      try { body.data = JSON.parse(body.data); } catch (_) {}
    }

    if (body.action === 'requestOtp') {
      return formatResponse(handleOtpRequest(body.email));
    }
    if (body.action === 'verifyOtp') {
      return formatResponse(verifyOtpAndCreateSession(body.email, body.otp));
    }
    if (body.action === 'verify_session') {
      const session = verifySession(body.token);
      return jsonResponse({
        valid: !!session,
        email: session?.email,
        plan: session?.plan || 'basic',
        expiry: session?.expiry
      });
    }
    if (body.action === 'getAnalytics') {
      const session = verifySession(body.token);
      if (!session) throw new Error('SESSION_EXPIRED');
      if (session.plan !== 'standard') throw new Error('ANALYTICS_STANDARD_ONLY');
      return jsonResponse({ status: 'success', data: getAnalyticsData_(session.analyticsId || session.profileId) });
    }
    if (body.action === 'update_email_preferences') {
      const session = verifySession(body.token);
      if (!session) throw new Error('SESSION_EXPIRED');
      if (normalizeEmail_(session.email) !== normalizeEmail_(body.email)) {
        throw new Error('SESSION_EMAIL_MISMATCH');
      }
      return jsonResponse(handleEmailPreferenceUpdate(body.email, body.unsubscribed === true, session.plan));
    }
    if (body.action !== 'update_profile') {
      throw new Error('INVALID_ACTION: received "' + (body.action || 'undefined') + '"');
    }
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new Error('INVALID_PROFILE_DATA');
    }

    const session = verifySession(body.token);
    if (!session) throw new Error('SESSION_EXPIRED');
    if (normalizeEmail_(session.email) !== normalizeEmail_(body.email)) {
      throw new Error('SESSION_EMAIL_MISMATCH');
    }

    return jsonResponse(handleProfileUpdate(
      body.email,
      body.data || {},
      body.previousProfilePic || null,
      session.plan
    ));
  } catch (error) {
    console.error('doPost error:', error.message);
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifySession(token) {
  if (!token) return null;
  const cacheKey = `session_${token}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  if (!cached) return null;
  try {
    const s = JSON.parse(cached);
    if (Date.now() > s.expiry) { CacheService.getScriptCache().remove(cacheKey); return null; }
    return s;
  } catch (_) { return null; }
}

// ─── Fuzzy column finder ────────────────────────────────────
// Strips spaces/underscores/dashes so "Profile Picture URL",
// "profile_picture_url", "profilepictureurl" all match.
function findColumn_(headers, ...candidates) {
  const norm = headers.map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const c of candidates) {
    const target = String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = norm.indexOf(target);
    if (idx !== -1) return idx;
  }
  for (const c of candidates) {
    const target = String(c).toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = norm.findIndex(h => h && h.includes(target));
    if (idx !== -1) return idx;
  }
  return -1;
}

function getPlanSpreadsheet_(plan) {
  const normalizedPlan = String(plan || 'basic').trim().toLowerCase();
  const spreadsheetId = CONFIG.PLAN_DATABASES?.[normalizedPlan];
  if (!spreadsheetId) throw new Error('INVALID_PLAN');
  return SpreadsheetApp.openById(spreadsheetId);
}

function handleProfileUpdate(email, updateData, previousProfilePic, plan) {
  const sheet = getPlanSpreadsheet_(plan).getSheetByName('Form');
  if (!sheet) throw new Error('SHEET_NOT_FOUND');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('PROFILE_NOT_FOUND');

  const headers = data[0];
  const COLUMNS = {
    EMAIL:            findColumn_(headers, 'email'),
    NAME:             findColumn_(headers, 'name'),
    TAGLINE:          findColumn_(headers, 'tagline'),
    PHONE:            findColumn_(headers, 'phone'),
    ADDRESS:          findColumn_(headers, 'address'),
    SOCIAL_LINKS:     findColumn_(headers, 'social links', 'sociallinks', 'social_links'),
    PROFILE_PIC:      findColumn_(headers, 'profile picture url', 'profile picture', 'profile pic', 'profilepic', 'profile_pic', 'image'),
    TIMESTAMP:        findColumn_(headers, 'timestamp', 'date'),
    STYLE:            findColumn_(headers, 'selected style', 'style')
  };

  console.log('Column match:', JSON.stringify(COLUMNS));

  if (COLUMNS.EMAIL === -1) {
    throw new Error('SCHEMA_MISMATCH: no Email column. Headers=' + JSON.stringify(headers));
  }
  if (COLUMNS.PROFILE_PIC === -1) {
    console.warn('No profile picture column found. Headers=' + JSON.stringify(headers));
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  validateProfileUpdate_(updateData);
  const rowIndex = data.findIndex((row, idx) =>
    idx > 0 && row[COLUMNS.EMAIL] &&
    row[COLUMNS.EMAIL].toString().trim().toLowerCase() === normalizedEmail
  );
  if (rowIndex === -1) throw new Error('PROFILE_NOT_FOUND');
  const rowNumber = rowIndex + 1;

  const updates = {};
  const skipped = [];

  function trySet(col, value, label) {
    if (value === undefined) return;
    if (col === -1) { skipped.push(label); return; }
    updates[col] = value;
  }

  trySet(COLUMNS.NAME,             updateData.name,             'name');
  trySet(COLUMNS.TAGLINE,          updateData.tagline,          'tagline');
  trySet(COLUMNS.PHONE,            updateData.phone,            'phone');
  trySet(COLUMNS.ADDRESS,          updateData.address,          'address');
  trySet(COLUMNS.PROFILE_PIC,      updateData.profilePic,       'profilePic');

  if (updateData.socialLinks !== undefined) {
    trySet(COLUMNS.SOCIAL_LINKS,
      Array.isArray(updateData.socialLinks) ? updateData.socialLinks.join('\n') : updateData.socialLinks,
      'socialLinks');
  }
  trySet(COLUMNS.STYLE,            updateData.style,            'style');

  if (skipped.length) throw new Error('SCHEMA_MISMATCH: missing columns for ' + skipped.join(', '));

  if (COLUMNS.TIMESTAMP !== -1) updates[COLUMNS.TIMESTAMP] = new Date().toISOString();

  // Write individual cells — safer than rewriting the full row
  Object.entries(updates).forEach(([col, value]) => {
    sheet.getRange(rowNumber, Number(col) + 1).setValue(value === null ? '' : value);
  });

  // Cloudinary cleanup (best-effort, doesn't block the response)
  const toDelete = [];
  if (previousProfilePic && previousProfilePic !== updateData.profilePic) toDelete.push(previousProfilePic);
  toDelete.forEach(url => deleteCloudinaryAsset_(url));

  return {
    status: 'success',
    message: 'Profile updated successfully',
    timestamp: updates[COLUMNS.TIMESTAMP],
    updatedFields: Object.keys(updateData),
    skippedFields: skipped,
    columnsMatched: COLUMNS,
    deletedAssets: toDelete
  };
}

function handleEmailPreferenceUpdate(email, unsubscribed, plan) {
  const sheet = getPlanSpreadsheet_(plan).getSheetByName('Form');
  if (!sheet) throw new Error('SHEET_NOT_FOUND');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('PROFILE_NOT_FOUND');

  const headers = data[0];
  const emailColumn = findColumn_(headers, 'email');
  const preferenceColumn = findColumn_(
    headers,
    'email preference',
    'email preferences',
    'email status',
    'email opt out',
    'email opt out status',
    'unsubscribe',
    'unsubscribed'
  );
  if (emailColumn === -1) throw new Error('SCHEMA_MISMATCH: no Email column');
  if (preferenceColumn === -1) throw new Error('SCHEMA_MISMATCH: no email preference column');

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rowIndex = data.findIndex((row, index) =>
    index > 0 && row[emailColumn] && row[emailColumn].toString().trim().toLowerCase() === normalizedEmail
  );
  if (rowIndex === -1) throw new Error('PROFILE_NOT_FOUND');

  const value = unsubscribed ? 'unsubscribed' : '';
  sheet.getRange(rowIndex + 1, preferenceColumn + 1).setValue(value);
  return {
    status: 'success',
    message: unsubscribed ? 'Email updates disabled' : 'Email updates enabled',
    unsubscribed
  };
}

function validateProfileUpdate_(data) {
  const textFields = { name: 120, tagline: 120, phone: 80, address: 500, profilePic: 2048, style: 4096 };
  Object.keys(textFields).forEach(key => {
    if (data[key] === undefined) return;
    if (typeof data[key] !== 'string') throw new Error('INVALID_FIELD: ' + key);
    if (data[key].length > textFields[key]) throw new Error('FIELD_TOO_LONG: ' + key);
  });
  if (data.name !== undefined && !data.name.trim()) throw new Error('NAME_REQUIRED');
  if (data.profilePic && !/^https?:\/\//i.test(data.profilePic)) throw new Error('INVALID_PROFILE_PICTURE_URL');
  if (data.style !== undefined && !STYLE_RE_.test(data.style)) {
    throw new Error('INVALID_STYLE');
  }
  if (data.socialLinks !== undefined) {
    if (!Array.isArray(data.socialLinks) || data.socialLinks.length > 6) throw new Error('INVALID_SOCIAL_LINKS');
    data.socialLinks.forEach(link => {
      if (typeof link !== 'string' || link.length > 2048 || !/^https?:\/\//i.test(link)) {
        throw new Error('INVALID_SOCIAL_LINK');
      }
    });
  }
}

// ─── Cloudinary asset deletion ──────────────────────────────
function deleteCloudinaryAsset_(url) {
  try {
    if (!url || typeof url !== 'string') { console.log('Delete skip: empty'); return; }
    if (!url.includes('res.cloudinary.com')) { console.log('Delete skip: not cloudinary'); return; }

    const props     = PropertiesService.getScriptProperties();
    const apiKey    = props.getProperty('CLOUDINARY_KEY');
    const apiSecret = props.getProperty('CLOUDINARY_SECRET');
    const cloudName = props.getProperty('CLOUDINARY_CLOUD') || 'dufg7fm4stt';

    if (!apiKey || !apiSecret) {
      console.warn('Cloudinary credentials missing — set CLOUDINARY_KEY / CLOUDINARY_SECRET in Script Properties');
      return;
    }

    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?(?:\?.*)?$/i);
    if (!match) { console.warn('Could not extract public_id from', url); return; }
    const publicId = decodeURIComponent(match[1]);

    const timestamp = Math.floor(Date.now() / 1000);
    const toSign    = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_1, toSign, Utilities.Charset.UTF_8
    ).map(b => (b & 0xff).toString(16).padStart(2, '0')).join('');

    const response = UrlFetchApp.fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: 'post',
        payload: { public_id: publicId, timestamp, api_key: apiKey, signature },
        muteHttpExceptions: true
      }
    );
    console.log('Cloudinary destroy:', publicId, '→', response.getContentText());
  } catch (e) {
    console.warn('Cloudinary delete error:', e.message);
  }
}

function getAnalyticsData_(analyticsId) {
  const wantedId = String(analyticsId || '').trim();
  if (!wantedId) throw new Error('ANALYTICS_ID_NOT_FOUND');

  const book = getPlanSpreadsheet_('standard');
  const weekly = new Map();
  const summarizedWeeks = new Set();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daily = new Map();
  for (let offset = 29; offset >= 0; offset--) {
    const day = new Date(today);
    day.setDate(day.getDate() - offset);
    const key = analyticsDateKey_(day);
    daily.set(key, { date: key, visits: 0, linkClicks: 0 });
  }
  const linkCounts = {};
  const totals = {
    visits: 0, shares: 0, saves: 0, copies: 0, link_clicks: 0,
    contact_email: 0, contact_phone: 0, contact_location: 0
  };

  const bucketFor_ = (date) => {
    const start = analyticsWeekStart_(date);
    const key = analyticsDateKey_(start);
    if (!weekly.has(key)) weekly.set(key, {
      weekStart: key, visits: 0, shares: 0, saves: 0, copies: 0, linkClicks: 0,
      contact_email: 0, contact_phone: 0, contact_location: 0
    });
    return weekly.get(key);
  };
  const addMetric_ = (bucket, metric, count) => {
    const amount = Math.max(0, Number(count) || 0);
    if (!amount) return;
    if (metric === 'link_clicks') {
      bucket.linkClicks += amount;
      totals.link_clicks += amount;
    } else if (Object.prototype.hasOwnProperty.call(totals, metric)) {
      bucket[metric] += amount;
      totals[metric] += amount;
    }
  };
  const addLinks_ = (value) => {
    if (!value) return;
    let links = value;
    if (typeof links === 'string') {
      try { links = JSON.parse(links); } catch (_) { return; }
    }
    if (Array.isArray(links)) {
      links.forEach(item => {
        if (typeof item === 'string') linkCounts[item] = (linkCounts[item] || 0) + 1;
        else if (item && typeof item === 'object') {
          const label = String(item.domain || item.link || item.url || item.name || '').trim();
          const count = Number(item.count || item.clicks || item.total || 0);
          if (label && count > 0) linkCounts[label] = (linkCounts[label] || 0) + count;
        }
      });
    } else if (links && typeof links === 'object') {
      Object.entries(links).forEach(([label, count]) => {
        const amount = Number(count);
        if (label && amount > 0) linkCounts[label] = (linkCounts[label] || 0) + amount;
      });
    }
  };

  // Weekly summaries let the editor retain history after the cron removes raw events.
  const summarySheet = book.getSheetByName('Analytics Summary');
  if (summarySheet && summarySheet.getLastRow() > 1) {
    const values = summarySheet.getDataRange().getValues();
    const headers = values[0];
    const idCol = findColumn_(headers, 'Analytics ID', 'Profile ID', 'ID');
    const startCol = findColumn_(headers, 'Week Start', 'Week Starting', 'Week');
    const countsCol = findColumn_(headers, 'Counts JSON', 'Counts', 'Summary JSON', 'Event Counts');
    const linksCol = findColumn_(headers, 'Link Domains JSON', 'Link Domains', 'Links JSON', 'Top Links');
    const metricCols = {};
    headers.forEach((header, index) => {
      const metric = analyticsMetric_(header);
      if (metric) metricCols[metric] = index;
    });

    values.slice(1).forEach(row => {
      if (idCol < 0 || String(row[idCol] || '').trim() !== wantedId) return;
      const date = startCol < 0 ? null : analyticsDate_(row[startCol]);
      if (!date) return;
      const bucket = bucketFor_(date);
      const key = bucket.weekStart;
      summarizedWeeks.add(key);

      let counts = countsCol < 0 ? null : row[countsCol];
      if (typeof counts === 'string') {
        try { counts = JSON.parse(counts); } catch (_) { counts = null; }
      }
      let hasParsedCounts = false;
      if (counts && typeof counts === 'object' && !Array.isArray(counts)) {
        hasParsedCounts = true;
        Object.entries(counts).forEach(([name, count]) => {
          const metric = analyticsMetric_(name);
          if (metric && typeof count !== 'object') addMetric_(bucket, metric, count);
          else if (metric === 'link_clicks' && count && typeof count === 'object') {
            if (linksCol < 0) addLinks_(count);
            addMetric_(bucket, metric, Object.values(count).reduce((sum, n) => sum + (Number(n) || 0), 0));
          }
        });
      }
      if (!hasParsedCounts) {
        Object.entries(metricCols).forEach(([metric, index]) => addMetric_(bucket, metric, row[index]));
      }
      if (linksCol >= 0) addLinks_(row[linksCol]);
    });
  }

  const rawSheet = book.getSheetByName('Analytics');
  if (rawSheet && rawSheet.getLastRow() > 1) {
    const values = rawSheet.getDataRange().getValues();
    const headers = values[0];
    const idCol = findColumn_(headers, 'Analytics ID', 'Profile ID', 'ID');
    const dateCol = findColumn_(headers, 'Timestamp', 'Created At', 'Date', 'Event Time');
    const eventCol = findColumn_(headers, 'Event Type', 'Event', 'Action', 'Type');
    const detailCol = findColumn_(headers, 'Details', 'Detail', 'Target', 'Link', 'URL', 'Domain');
    if (idCol < 0 || dateCol < 0 || eventCol < 0) throw new Error('ANALYTICS_SCHEMA_MISMATCH');

    values.slice(1).forEach(row => {
      if (String(row[idCol] || '').trim() !== wantedId) return;
      const date = analyticsDate_(row[dateCol]);
      if (!date) return;
      const bucket = bucketFor_(date);

      let eventName = row[eventCol];
      let details = detailCol < 0 ? '' : row[detailCol];
      if (details && typeof details === 'string' && /^[\[{]/.test(details.trim())) {
        try {
          const parsed = JSON.parse(details);
          if (parsed && typeof parsed === 'object') {
            eventName = eventName || parsed.event || parsed.type || parsed.action;
            details = parsed.domain || parsed.link || parsed.url || parsed.target || details;
          }
        } catch (_) {}
      }
      const metric = analyticsMetric_(eventName);
      const day = daily.get(analyticsDateKey_(date));
      if (day && metric === 'visits') day.visits += 1;
      if (day && metric === 'link_clicks') day.linkClicks += 1;

      // Keep weekly totals from double-counting rows already included in a summary.
      if (summarizedWeeks.has(bucket.weekStart)) return;
      if (metric) addMetric_(bucket, metric, 1);
      if (metric === 'link_clicks' && details) {
        const label = analyticsLinkLabel_(details);
        if (label) linkCounts[label] = (linkCounts[label] || 0) + 1;
      }
    });
  }

  const weeks = Array.from(weekly.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return {
    ...totals,
    top_links: Object.entries(linkCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    contact_actions: {
      email: totals.contact_email,
      phone: totals.contact_phone,
      location: totals.contact_location,
      total: totals.contact_email + totals.contact_phone + totals.contact_location
    },
    weekly: weeks.slice(-12),
    daily: Array.from(daily.values()),
    updated_at: new Date().toISOString()
  };
}

function analyticsWeekStart_(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function analyticsDateKey_(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function analyticsDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function analyticsMetric_(name) {
  const key = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^(visit|visits|view|views|profileview|profileviews|profilevisit|profilevisits|pageview|pageviews|totalvisits|totalviews)$/.test(key)) return 'visits';
  if (/^(share|shares|profileshare|profileshares|shareprofile|sharecard|shareclick|totalshares)$/.test(key)) return 'shares';
  if (/^(save|saves|savecontact|savecontacts|savevcard|downloadcontact|vcarddownload|contactdownload|totalsaves)$/.test(key)) return 'saves';
  if (/^(copy|copies|copydetails|copycontact|totalcopies)$/.test(key)) return 'copies';
  if (/^(click|clicks|linkclick|linkclicks|linkclickout|totalclicks)$/.test(key)) return 'link_clicks';
  if (/^(contactemail|emailclick|contactemailclick)$/.test(key)) return 'contact_email';
  if (/^(contactphone|phoneclick|contactphoneclick)$/.test(key)) return 'contact_phone';
  if (/^(contactlocation|locationclick|contactlocationclick)$/.test(key)) return 'contact_location';
  return null;
}

function analyticsLinkLabel_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].replace(/^www\./i, '') || text;
}
