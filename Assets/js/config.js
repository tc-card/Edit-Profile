// Configuration constants
export const CONFIG = {
  googleScriptUrl: 'YOUR_GOOGLE_SCRIPT_URL',
  maxSocialLinks: {
    basic: 6,
    standard: Infinity,
    premium: Infinity
  },
  socialPlatforms: {
    facebook: 'https://facebook.com/',
    twitter: 'https://twitter.com/',
    instagram: 'https://instagram.com/',
    linkedin: 'https://linkedin.com/in/',
    youtube: 'https://youtube.com/',
    tiktok: 'https://tiktok.com/@'
  }
};

// DOM Elements
export const DOM = {
  loginScreen: document.getElementById('loginScreen'),
  emailForm: document.getElementById('emailForm'),
  otpForm: document.getElementById('otpForm'),
  loginEmail: document.getElementById('loginEmail'),
  requestOtpBtn: document.getElementById('requestOtpBtn'),
  otpEmailDisplay: document.getElementById('otpEmailDisplay'),
  verifyOtpBtn: document.getElementById('verifyOtpBtn'),
  backToEmailBtn: document.getElementById('backToEmailBtn'),
  profileEditor: document.getElementById('profileEditor')
};

// Application state
export const state = {
  currentUser: {
    email: null,
    sessionToken: null,
    profileData: null,
    userPlan: 'standard'
  },
  modals: {}
};