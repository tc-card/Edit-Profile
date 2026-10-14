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
    // Input validation
    if (!isValidEmail(email)) {
      throw new Error('Invalid email address');
    }
    
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      throw new Error('Invalid OTP format');
    }
    
    const emailData = {
      to: email,
      name: 'tccards.tn',
      subject: `Your Verification Code: ${otp}`,
      htmlBody: buildEmailTemplate(otp),
      noReply: true
    };
    
    // Add reply-to if supported by your email service
    if (MailApp.sendEmail.length > 1 && typeof MailApp.sendEmail({}) === 'object') {
      emailData.replyTo = 'noreply@tccards.tn';
    }
    
    MailApp.sendEmail(emailData);
    
    // Enhanced logging
    console.log(`OTP sent to ${email} at ${new Date().toISOString()}`);
    
    // Return success info for tracking
    return {
      success: true,
      timestamp: new Date().toISOString(),
      email: email,
      otpLength: otp.length
    };
    
  } catch (error) {
    // Enhanced error logging
    console.error(`Email sending failed for ${email}:`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    // Different error types for different failures
    if (error.message.includes('Invalid email')) {
      throw new Error('INVALID_EMAIL_ADDRESS');
    } else if (error.message.includes('Invalid OTP')) {
      throw new Error('INVALID_OTP_FORMAT');
    } else {
      throw new Error('EMAIL_SENDING_FAILED');
    }
  }
}

function buildEmailTemplate(otp) {
  const expiryMinutes = CONFIG.OTP_EXPIRY_MINUTES || 10;
  const currentYear = new Date().getFullYear();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Your Verification Code</title>
    <style>
    p { color: #171717 !important; font-size: 14px !important; line-height: 24px !important; margin: 0 0 16px 0 !important; }
    h1 { color: #171717 !important; font-weight: 600 !important; letter-spacing: -0.02em !important; margin: 0 0 24px 0 !important; padding: 0 !important; }
    a { color: #0067D6 !important; text-decoration: none !important; }
    .tccards-code-block a { color: #171717 !important; text-decoration: none !important; }
    strong { color: #171717 !important; font-weight: 600 !important; }
    hr { border-top: 1px solid #E6E6E6 !important; border-bottom: none !important; border-left: none !important; border-right: none !important; }
    .footer-text { color: #7D7D7D !important; font-size: 12px !important; line-height: 1.5 !important; margin: 0 0 8px 0 !important; }
    .footer-text a { color: #7D7D7D !important; text-decoration: underline !important; font-weight: 400 !important; }
    .brand-logo { display: block; filter: invert(0); }

    @media (prefers-color-scheme: dark) {
      html, body { background-color: #0A0A0A !important; }
      body, p, td, th, span { color: #ededed !important; }
      h1, strong { color: #ffffff !important; }
      a { color: #4da3ff !important; }
      .footer-text, .footer-text p { color: #7D7D7D !important; }
      .footer-text a { color: #7D7D7D !important; }
      hr { border-top-color: #333333 !important; }
      .brand-logo { filter: invert(1) !important; }
      .tccards-code-block { background-color: #1F1F1F !important; color: #ffffff !important; }
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
                    <!-- Using a geometric triangle icon matching Vercel's visual weight -->
                    <img src="https://postimg.cc" width="24" height="21" alt="tccards.tn" class="brand-logo">
                  </div>
                  
                  <h1>Verify your identity for <strong>tccards.tn</strong></h1>
                  <p>Please use the following verification code to complete your request:</p>

                  <!-- OTP Code Block -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="width:100% !important; margin:24px 0;">
                    <tr>
                      <td align="center" bgcolor="#F2F2F2" class="tccards-code-block" valign="middle" height="72" style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; font-size:44px; font-weight:bold; letter-spacing:12px; border-radius:8px;">
                        ${otp}
                      </td>
                    </tr>
                  </table>

                  <p>This code expires in <strong>${expiryMinutes} minutes</strong>.</p>
                  
                  <hr style="margin:44px 0 32px 0; width:100%;">
                  
                  <!-- Security Notice & Footer -->
                  <p class="footer-text" style="margin-bottom: 20px;">
                    <strong>Security Notice:</strong> If you didn't request this verification code, please ignore this email. Never share this code with anyone. Our team will never ask for your code.
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
    </html>

  `;
}

// Utility function for email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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
        timestamp: row[0] || '',
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