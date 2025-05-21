// Configuration constants
export const CONFIG = {
  googleScriptUrl: 'https://script.google.com/macros/s/AKfycbyTSxPXhQllvSdPPbV_olcsHqqZDUL-dWlteqWkHqavwWA3Zv-Zz0gI7x1CBCjVAwOj/exec', // version new edit 0.00.2
  sessionExpiryHours: 1, // Matches GAS session duration
  otpExpiryMinutes: 5,   // Matches GAS OTP duration
  
  sheetColumns: {
    timestamp: 0,      // Column A (auto)
    name: 1,           // Column B
    email: 2,          // Column C
    link: 3,           // Column D (readonly)
    tagline: 4,        // Column E
    phone: 5,          // Column F
    address: 6,        // Column G
    socialLinks: 7,    // Column H (newline separated)
    style: 8,          // Column I
    profilePic: 9,     // Column J
    formEmail: 10,     // Column K (readonly)
    id: 11,            // Column L (readonly)
    status: 12         // Column M (readonly)
  },
  maxSocialLinks: 6,
  
  socialPlatforms: {
    "facebook.com": "fab fa-facebook",
    "fb.com": "fab fa-facebook",
    "fb.me": "fab fa-facebook",
    "messenger.com": "fab fa-facebook-messenger",
    "m.me": "fab fa-facebook-messenger",
    "twitter.com": "fab fa-twitter",
    "x.com": "fab fa-x-twitter",
    "instagram.com": "fab fa-instagram",
    "linkedin.com": "fab fa-linkedin",
    "youtube.com": "fab fa-youtube",
    "tiktok.com": "fab fa-tiktok",
    "pinterest.com": "fab fa-pinterest",
    "snapchat.com": "fab fa-snapchat",
    "reddit.com": "fab fa-reddit",
    "discord.com": "fab fa-discord",
    "twitch.tv": "fab fa-twitch",
    "github.com": "fab fa-github",
    "discord.gg": "fab fa-discord",
    "cal.com": "fas fa-calendar-alt",
    "calendly.com": "fas fa-calendar-alt",
    "linktree.com": "fas fa-link",
    "linktr.ee": "fas fa-link",
    "tccards.tn": "fas fa-id-card",
    "medium.com": "fab fa-medium",
    "whatsapp.com": "fab fa-whatsapp",
    "wa.me": "fab fa-whatsapp",
    "dribbble.com": "fab fa-dribbble",
    "behance.net": "fab fa-behance",
    "telegram.org": "fab fa-telegram",
    "t.me": "fab fa-telegram",
    "vimeo.com": "fab fa-vimeo",
    "spotify.com": "fab fa-spotify",
    "apple.com": "fab fa-apple",
    "google.com": "fab fa-google",
    "youtube-nocookie.com": "fab fa-youtube",
    "soundcloud.com": "fab fa-soundcloud",
    "paypal.com": "fab fa-paypal",
    "github.io": "fab fa-github",
    "stackoverflow.com": "fab fa-stack-overflow",
    "quora.com": "fab fa-quora",
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
  profileEditor: document.getElementById('profileEditor'),
  logoutBtn: document.getElementById('logoutBtn')
};

// Application state
export const state = {
  currentUser: {
    email: null,
    sessionToken: null,
    expiry: null
  },
  profileData: null
};