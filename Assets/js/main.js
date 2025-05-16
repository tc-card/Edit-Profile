import { CONFIG, DOM, state } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp } from './auth.js';
import { loadProfileData, saveProfile } from './profile.js';

// Initialize the application
async function initApp() {
  // Setup authentication
  setupOtpInputs();
  
  // Event listeners
  DOM.requestOtpBtn.addEventListener('click', async () => {
    const success = await requestOtp();
    if (success) {
      DOM.verifyOtpBtn.addEventListener('click', async () => {
        const verified = await verifyOtp();
        if (verified) {
          DOM.loginScreen.classList.add('hidden');
          DOM.profileEditor.classList.remove('hidden');
          await loadProfileData();
        }
      });
    }
  });
  
  DOM.backToEmailBtn.addEventListener('click', () => {
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
  });
  
  // Check for existing session (e.g., from localStorage)
  checkExistingSession();
}

async function checkExistingSession() {
  // Implement session persistence if needed
  // const savedSession = localStorage.getItem('profileEditorSession');
  // if (savedSession) { ... }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  Swal.fire({
    icon: 'error',
    title: 'Application Error',
    text: 'An unexpected error occurred. Please try again.',
    background: '#1e293b',
    color: '#f8fafc'
  });
});