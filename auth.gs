/**
 * Profile Editor Backend Service
 * Handles OTP generation, verification, and session management
 * @fileoverview Secure authentication service for profile editor
 */

// Configuration constants
const CONFIG = {
  SHEET_NAME: 'Form',
  OTP_EXPIRY_MINUTES: 5,
  SESSION_EXPIRY_HOURS: 1,
  MIN_OTP_INTERVAL: 1, // minutes between OTP requests
  SALT: 'I3faQrOPY7gnXztr7uXWzOKBcnZXlaKg',
  DISPOSABLE_DOMAINS: [
    'tempmail.com',
    'mailinator.com',
    'guerrillamail.com'
    // Add more as needed
  ]
};

/**
 * Main GET request handler
 * @param {Object} e - Event object with request parameters
 * @return {ContentService.TextOutput} JSON or JSONP response
 */
function doGet(e) {
  try {
    validateRequest(e);
    
    const { action, email, callback, otp } = e.parameter;
    let response;
    
    switch (action) {
      case 'requestOtp':
        response = handleOtpRequest(email);
        break;
      case 'verifyOtp':
        response = verifyOtpAndCreateSession(email, otp);
        break;
      default:
        throw new Error('Invalid action parameter');
    }
    
    return formatResponse(response, callback);
    
  } catch (error) {
    console.error(`Error processing ${e.parameter.action}:`, error.message);
    return formatResponse(
      { status: 'error', message: sanitizeErrorMessage(error.message) },
      e.parameter.callback
    );
  }
}

// ================== VALIDATION FUNCTIONS ==================

function validateRequest(request) {
  if (!request.parameter.action) {
    throw new Error('Missing action parameter');
  }
}

function validateEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address');
  }
  
  const domain = email.split('@')[1].toLowerCase();
  if (CONFIG.DISPOSABLE_DOMAINS.includes(domain)) {
    throw new Error('Disposable email addresses are not allowed');
  }
}

function validateOtp(otp) {
  if (!otp || !/^\d{6}$/.test(otp)) {
    throw new Error('Invalid OTP format');
  }
}

// ================== OTP FUNCTIONS ==================

function handleOtpRequest(email) {
  validateEmail(email);
  
  if (!isEmailRegistered(email)) {
    throw new Error('No active profile found with this email address');
  }
  
  checkOtpRateLimit(email);
  
  const otp = generateOtp();
  storeOtp(email, otp);
  sendOtpEmail(email, otp);
  recordOtpRequest(email);
  
  return {
    status: 'success',
    message: 'Verification code sent to your email'
  };
}

function checkOtpRateLimit(email) {
  const lastOtpTime = getLastOtpTime(email);
  const currentTime = Date.now();
  const minInterval = CONFIG.MIN_OTP_INTERVAL * 60 * 1000;
  
  if (lastOtpTime && (currentTime - lastOtpTime < minInterval)) {
    throw new Error(`Please wait ${CONFIG.MIN_OTP_INTERVAL} minute(s) before requesting another code`);
  }
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOtp(email, otp) {
  const cacheKey = `otp_${hashData(email)}`;
  const expiry = Date.now() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000;
  
  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify({ otp: hashData(otp), expiry }),
    CONFIG.OTP_EXPIRY_MINUTES * 60
  );
}

function verifyStoredOtp(email, otp) {
  const cacheKey = `otp_${hashData(email)}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  
  if (!cached) throw new Error('OTP expired or invalid');
  
  const { otp: storedOtp, expiry } = JSON.parse(cached);
  
  if (Date.now() > expiry) throw new Error('OTP expired');
  if (storedOtp !== hashData(otp)) throw new Error('Invalid OTP');
}

// ================== SESSION FUNCTIONS ==================

function verifyOtpAndCreateSession(email, otp) {
  validateEmail(email);
  validateOtp(otp);
  verifyStoredOtp(email, otp);
  
  const token = createSessionToken(email);
  const profile = getProfileData(email);
  
  if (!profile) {
    throw new Error('Profile data not found');
  }
  
  return {
    status: 'success',
    token: token,
    profile: profile
  };
}

function createSessionToken(email) {
  const token = Utilities.getUuid();
  const expiry = Date.now() + CONFIG.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
  
  CacheService.getScriptCache().put(
    `session_${token}`,
    JSON.stringify({ email, expiry }),
    CONFIG.SESSION_EXPIRY_HOURS * 60 * 60
  );
  
  return token;
}

// ================== EMAIL FUNCTIONS ==================

function sendOtpEmail(email, otp) {
  try {
    MailApp.sendEmail({
      to: email,
      subject: 'Your Verification Code',
      htmlBody: buildEmailTemplate(otp)
    });
    console.log(`OTP sent to ${email}`); // Dev logging
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send verification email');
  }
}

function buildEmailTemplate(otp) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4a4a4a;">Your Verification Code</h2>
      <p style="font-size: 16px;">Please use the following code to verify your identity:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;
                  font-size: 24px; font-weight: bold; letter-spacing: 2px;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #666;">
        This code will expire in ${CONFIG.OTP_EXPIRY_MINUTES} minutes.
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;
}

// ================== DATA FUNCTIONS ==================

function isEmailRegistered(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  // Skip header row if exists
  const startRow = data[0][0] === 'ID' ? 1 : 0;
  
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    const rowEmail = row[2] ? row[2].toString().trim().toLowerCase() : '';
    const status = row[12] ? row[12].toString().trim().toLowerCase() : 'active';
    
    if (rowEmail === email.toLowerCase()) {
      if (status !== 'active') {
        throw new Error('Account is not active. Please contact support.');
      }
      return true;
    }
  }
  return false;
}

function getProfileData(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  for (const row of data) {
    if (row[2] && row[2].toString().toLowerCase() === email.toLowerCase()) {
      return {
        name: row[1] || '',
        email: row[2] || '',
        link: row[3] || '',
        tagline: row[4] || '',
        phone: row[5] || '',
        address: row[6] || '',
        socialLinks: row[7] ? row[7].split('\n').filter(Boolean) : [],
        style: row[8] || 'default',
        profilePic: row[9] || '',
        formEmail: row[10] || '',
        id: row[11] || '',
        status: row[12] || 'active'
      };
    }
  }
  return null;
}

// ================== UTILITY FUNCTIONS ==================

function getLastOtpTime(email) {
  const cacheKey = `otp_time_${hashData(email)}`;
  const cached = CacheService.getScriptCache().get(cacheKey);
  return cached ? parseInt(cached) : null;
}

function recordOtpRequest(email) {
  const cacheKey = `otp_time_${hashData(email)}`;
  CacheService.getScriptCache().put(
    cacheKey,
    Date.now().toString(),
    CONFIG.OTP_EXPIRY_MINUTES * 60
  );
}

function hashData(data) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    data + CONFIG.SALT
  ).reduce((str, byte) => str + (byte & 255).toString(16).padStart(2, '0'), '');
}

function formatResponse(data, callback) {
  const response = JSON.stringify(data);
  return ContentService.createTextOutput(
    callback ? `${callback}(${response})` : response
  ).setMimeType(
    callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON
  );
}

function sanitizeErrorMessage(message) {
  return message.replace(/[\n\r]/g, ' ');
}