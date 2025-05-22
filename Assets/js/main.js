import { CONFIG, DOM, state } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp, checkExistingSession, logout } from './auth.js';
import { loadProfileData } from './profile.js';
import { showAlert } from './utils.js';

async function initApp() {
  try {
    setupOtpInputs();
    setupEventListeners();
    
    if (checkExistingSession()) {
      DOM.loginScreen.classList.add('hidden');
      DOM.profileEditor.classList.remove('hidden');
      await loadProfileData();
    }
  } catch (error) {
    console.error('Initialization error:', error);
    await showAlert('error', 'Initialization Error', 'Failed to initialize application');
  }
}

function setupEventListeners() {
  // OTP Request
  DOM.requestOtpBtn.addEventListener('click', async () => {
    if (await requestOtp()) {
      DOM.verifyOtpBtn.onclick = async () => {
        if (await verifyOtp()) {
          DOM.loginScreen.classList.add('hidden');
          DOM.profileEditor.classList.remove('hidden');
          await loadProfileData();  // This is called from profile.js
        }
      };
    }
  });
  
  // Back to email
  DOM.backToEmailBtn.addEventListener('click', () => {
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
    document.querySelectorAll('.otp-inputs input').forEach(i => {
      i.value = '';
      i.disabled = false;
    });
  });

  // Enter key submits email form
  DOM.loginEmail.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await requestOtp();
    }
  });
  
  // Add tab close event listener
  window.addEventListener('beforeunload', () => {
    // Log out user when tab is closed
    logout();
  });
}

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showAlert('error', 'Unexpected Error', 'An unexpected error occurred');
});

// Start app when DOM is ready
if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}