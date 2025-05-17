import { CONFIG, DOM, state } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp, checkExistingSession, showAlert } from './auth.js';

// Initialize application
async function initApp() {
  setupOtpInputs();
  setupEventListeners();
  
  // Check for existing valid session
  if (checkExistingSession()) {
    await showAlert('success', 'Welcome Back', 'You are already logged in');
    DOM.loginScreen.classList.add('hidden');
    DOM.profileEditor.classList.remove('hidden');
    // Here you would load the profile editor later
  }
}

function setupEventListeners() {
  // OTP Request Flow
  DOM.requestOtpBtn.addEventListener('click', async () => {
    if (await requestOtp()) {
      // Only setup verify handler after successful OTP request
      DOM.verifyOtpBtn.onclick = async () => {
        if (await verifyOtp()) {
          DOM.loginScreen.classList.add('hidden');
          DOM.profileEditor.classList.remove('hidden');
          // Here you would load the profile editor later
        }
      };
    }
  });
  
  // Back to email button
  DOM.backToEmailBtn.addEventListener('click', () => {
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
    // Clear OTP inputs
    document.querySelectorAll('.otp-inputs input').forEach(i => {
      i.value = '';
      i.disabled = false;
    });
  });
}

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  Swal.fire({
    icon: 'error',
    title: 'Application Error',
    text: 'An unexpected error occurred. Please refresh the page.',
    background: '#1e293b',
    color: '#f8fafc'
  });
});

// Start application
if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}