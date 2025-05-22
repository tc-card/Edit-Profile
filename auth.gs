// edit.gs Updated Code
const FORM_SHEET = 'Form';
const OTP_EXPIRY_MINUTES = 5;
const SALT = 'I3faQrOPY7gnXztr7uXWzOKBcnZXlaKg'; // Keep this consistent

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

function verifySession(token, expectedEmail = null) {
  const cached = CacheService.getScriptCache().get(`session_${token}`);
  if (!cached) throw new Error('Invalid or expired session');

  const session = JSON.parse(cached);
  if (Date.now() > session.expiry) throw new Error('Session expired');
  
  if (expectedEmail && session.email.toLowerCase() !== expectedEmail.toLowerCase()) {
    throw new Error('Token does not match email');
  }

  return session;
}