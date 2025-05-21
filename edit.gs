const FORM_SHEET = 'Form';
const OTP_EXPIRY_MINUTES = 5;
const SALT = 'I3faQrOPY7gnXztr7uXWzOKBcnZXlaKg';
const COLUMNS = {
  NAME: 1,
  EMAIL: 2,
  LINK: 3,
  TAGLINE: 4,
  PHONE: 5,
  ADDRESS: 6,
  SOCIAL_LINKS: 7,
  STYLE: 8,
  PROFILE_PIC: 9
};
function doGet(e) {
  try {
    // Debug logging
    console.log('Request parameters raw:', e);
    console.log('Parameter action:', e.parameter.action);
    console.log('Parameter email:', e.parameter.email);
    
    if (!e.parameter || !e.parameter.action) {
      return jsonResponse({
        status: 'error',
        message: 'Missing action parameter'
      });
    }
    
    const action = e.parameter.action;
    let response;

    switch (action) {
      case 'request_otp':
        // Fix: Check if email exists in parameters
        if (!e.parameter.email || e.parameter.email.trim() === '') {
          return jsonResponse({
            status: 'error',
            message: 'Missing required fields: email'
          });
        }
        response = handleOtpRequest(e.parameter);
        break;
      case 'verify_otp':
        response = handleOtpVerification(e.parameter.email, e.parameter.otp);
        break;
      case 'get_profile':
        response = handleGetProfile(e.parameter.email, e.parameter.token);
        break;
      case 'update_profile':
        response = handleProfileUpdate(e.parameter.token, JSON.parse(e.parameter.data));
        break;
      default:
        throw new Error('Invalid action');
    }

    return jsonResponse(response);
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({
      status: 'error',
      message: error.message
    });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- OTP Request ---
function handleOtpRequest(params) {
  if (!params || !params.email) {
    throw new Error('Missing required fields: email');
  }

  const email = params.email.trim();
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Invalid email format');
  }

  if (!emailExists(email)) {
    throw new Error('No account found with this email');
  }

  const otp = generateOtp();
  const expiry = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  CacheService.getScriptCache().put(
    `otp_${hashData(email)}`,
    JSON.stringify({ otp: hashData(otp), expiry }),
    OTP_EXPIRY_MINUTES * 60
  );

  // In a real app, send the OTP via email
  // For demo purposes, we'll log it
  console.log(`OTP for ${email}: ${otp}`);

  return {
    status: 'success',
    message: 'OTP sent successfully',
    otpExpiry: OTP_EXPIRY_MINUTES
  };
}

// --- OTP Verification ---
function handleOtpVerification(email, otp) {
  const cacheKey = `otp_${hashData(email)}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  if (!cached) throw new Error('OTP expired or invalid');

  const { otp: storedOtp, expiry } = JSON.parse(cached);
  if (Date.now() > expiry) throw new Error('OTP expired');
  if (storedOtp !== hashData(otp)) throw new Error('Invalid OTP');

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(
    `session_${token}`,
    JSON.stringify({ email, expiry: Date.now() + 60 * 60 * 1000 }),
    60 * 60
  );

  return {
    status: 'success',
    token: token,
    profile: getProfileData(email)
  };
}

// --- Get Profile ---
function handleGetProfile(email, token) {
  verifySession(token, email);
  return {
    status: 'success',
    profile: getProfileData(email)
  };
}

// --- Update Profile ---
function handleProfileUpdate(token, updateData) {
  const session = verifySession(token);
  const email = session.email;

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex(row => row[COLUMNS.EMAIL]?.toLowerCase() === email.toLowerCase());

  if (rowIndex === -1) throw new Error('Profile not found');
  const row = rowIndex + 1;

  if (updateData.name !== undefined) sheet.getRange(row, COLUMNS.NAME + 1).setValue(updateData.name);
  if (updateData.tagline !== undefined) sheet.getRange(row, COLUMNS.TAGLINE + 1).setValue(updateData.tagline);
  if (updateData.phone !== undefined) sheet.getRange(row, COLUMNS.PHONE + 1).setValue(updateData.phone);
  if (updateData.address !== undefined) sheet.getRange(row, COLUMNS.ADDRESS + 1).setValue(updateData.address);
  if (updateData.profilePic !== undefined) sheet.getRange(row, COLUMNS.PROFILE_PIC + 1).setValue(updateData.profilePic);
  if (updateData.style !== undefined) sheet.getRange(row, COLUMNS.STYLE + 1).setValue(updateData.style);
  if (updateData.socialLinks !== undefined) {
    sheet.getRange(row, COLUMNS.SOCIAL_LINKS + 1).setValue(updateData.socialLinks.join(',\n'));
  }

  return {
    status: 'success',
    profile: getProfileData(email)
  };
}

// --- Helpers ---
function emailExists(email) {
  const data = getSheet().getDataRange().getValues();
  return data.some(row => 
    row[COLUMNS.EMAIL]?.toString().toLowerCase() === email.toLowerCase()
  );
}

function verifySession(token, expectedEmail = null) {
  const cached = CacheService.getScriptCache().get(`session_${token}`);
  if (!cached) throw new Error('Invalid or expired session');

  const session = JSON.parse(cached);
  if (expectedEmail && session.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error('Token does not match email');
  }

  return session;
}

function getProfileData(email) {
  const data = getSheet().getDataRange().getValues();
  const row = data.find(row => row[COLUMNS.EMAIL]?.toLowerCase() === email.toLowerCase());
  if (!row) return null;

  return {
    name: row[COLUMNS.NAME] || '',
    email: row[COLUMNS.EMAIL] || '',
    link: row[COLUMNS.LINK] || '',
    tagline: row[COLUMNS.TAGLINE] || '',
    phone: row[COLUMNS.PHONE] || '',
    address: row[COLUMNS.ADDRESS] || '',
    socialLinks: (row[COLUMNS.SOCIAL_LINKS] || '').split(',\n').filter(Boolean),
    style: row[COLUMNS.STYLE] || '',
    profilePic: row[COLUMNS.PROFILE_PIC] || ''
  };
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashData(data) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    data + SALT
  ).map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FORM_SHEET);
}