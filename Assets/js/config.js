// Configuration constants
export const CONFIG = {
  googleScriptUrl: 'https://script.google.com/macros/s/AKfycbxWutCqcPvL7FiLaTeBg2JeQ6DfvnX_cdl8DV9vHfiai9x_pjwJRTkVdyraN27exOVk/exec' // Replace with your deployed web app URL
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
    sessionToken: null
  }
};