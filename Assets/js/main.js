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

    // Reset OTP button state and start countdown
    clearInterval(window.countdownInterval);
    DOM.requestOtpBtn.disabled = true;
    DOM.requestOtpBtn.classList.add('opacity-75', 'cursor-not-allowed');
// Reverse transition with animation
DOM.otpForm.classList.add('opacity-0');
setTimeout(() => {
  DOM.otpForm.classList.add('hidden');
  DOM.emailForm.classList.remove('hidden', 'h-0', 'overflow-hidden', 'opacity-0');
  DOM.otpEmailDisplay.textContent = '';
  
  setTimeout(() => {
    DOM.emailForm.classList.remove('opacity-0');
    DOM.loginEmail?.focus();
  }, 50);
}, 300);
    // Start countdown timer
    let countdown = CONFIG.otpExpirySeconds;
    window.countdownInterval = setInterval(() => {
        if (countdown <= 0) {
            clearInterval(window.countdownInterval);
            DOM.requestOtpBtn.disabled = false;
            DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            DOM.requestOtpBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Resend OTP`;
        } else {
            DOM.requestOtpBtn.innerHTML = `Resend OTP (${countdown--})`;
        }
    }, 1000);
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