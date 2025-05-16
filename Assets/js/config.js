// Configuration constants
const CONFIG = {
  googleScriptUrl: 'YOUR_GOOGLE_SCRIPT_URL',
  maxSocialLinks: {
    basic: 6,
    standard: Infinity,
    premium: Infinity
  },
  colors: {
    primary: 'purple',
    secondary: 'blue',
    accent: 'orange',
    dark: 'gray-900',
    darker: 'gray-800'
  }
};

// DOM Elements
const DOM = {
  loginScreen: document.getElementById('loginScreen'),
  emailForm: document.getElementById('emailForm'),
  otpForm: document.getElementById('otpForm'),
  loginEmail: document.getElementById('loginEmail'),
  requestOtpBtn: document.getElementById('requestOtpBtn'),
  otpEmailDisplay: document.getElementById('otpEmailDisplay'),
  verifyOtpBtn: document.getElementById('verifyOtpBtn'),
  backToEmailBtn: document.getElementById('backToEmailBtn'),
  profileEditor: document.getElementById('profileEditor'),
  // Add other elements as needed
};

export { CONFIG, DOM };