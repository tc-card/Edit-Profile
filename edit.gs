/**
 * tccards — Profile Editor Backend
 */

function doGet(e) {
  try {
    const { action, token } = e.parameter;
    if (action === 'verify_session') {
      const session = verifySession(token);
      return jsonResponse({ valid: !!session, email: session?.email, expiry: session?.expiry });
    }
    if (action === 'getAnalytics') {
      return jsonResponse({ status: 'success', data: getAnalyticsData_(e.parameter.user) });
    }
    throw new Error('INVALID_ACTION');
  } catch (error) {
    return jsonResponse({ status: 'error', message: error.message });
  }
}

function doPost(e) {
  try {
    if (!e?.postData?.contents) throw new Error('NO_PAYLOAD');
    let body = JSON.parse(e.postData.contents);
    if (body.data && typeof body.data === 'string') {
      try { body.data = JSON.parse(body.data); } catch (_) {}
    }

    if (body.action !== 'update_profile') {
      throw new Error('INVALID_ACTION: received "' + (body.action || 'undefined') + '"');
    }

    const session = verifySession(body.token);
    if (!session) throw new Error('SESSION_EXPIRED');
    if (session.email.toLowerCase() !== String(body.email || '').toLowerCase()) {
      throw new Error('SESSION_EMAIL_MISMATCH');
    }

    return jsonResponse(handleProfileUpdate(
      body.email,
      body.data || {},
      body.previousProfilePic || null,
      body.previousBgImage || null
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

function handleProfileUpdate(email, updateData, previousProfilePic, previousBgImage) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form');
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
    STYLE:            findColumn_(headers, 'selected style', 'style'),
    BACKGROUND_IMAGE: findColumn_(headers, 'background image', 'backgroundimage', 'background_image', 'bgimage')
  };

  console.log('Column match:', JSON.stringify(COLUMNS));

  if (COLUMNS.EMAIL === -1) {
    throw new Error('SCHEMA_MISMATCH: no Email column. Headers=' + JSON.stringify(headers));
  }
  if (COLUMNS.PROFILE_PIC === -1) {
    console.warn('No profile picture column found. Headers=' + JSON.stringify(headers));
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
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
  trySet(COLUMNS.BACKGROUND_IMAGE, updateData.backgroundImage,  'backgroundImage');

  if (COLUMNS.TIMESTAMP !== -1) updates[COLUMNS.TIMESTAMP] = new Date().toISOString();

  // Write individual cells — safer than rewriting the full row
  Object.entries(updates).forEach(([col, value]) => {
    sheet.getRange(rowNumber, Number(col) + 1).setValue(value === null ? '' : value);
  });

  // Cloudinary cleanup (best-effort, doesn't block the response)
  const toDelete = [];
  if (previousProfilePic && previousProfilePic !== updateData.profilePic) toDelete.push(previousProfilePic);
  if (previousBgImage    && previousBgImage    !== updateData.backgroundImage) toDelete.push(previousBgImage);
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

function getAnalyticsData_() {
  return { visits: 0, shares: 0, saves: 0, copies: 0, link_clicks: {} };
}