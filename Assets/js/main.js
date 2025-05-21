import { CONFIG, DOM, state } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp, checkExistingSession } from './auth.js';
import { loadProfileData } from './profile.js';

async function initApp() {
  setupOtpInputs();
  setupEventListeners();
  
  if (checkExistingSession()) {
    DOM.loginScreen.classList.add('hidden');
    DOM.profileEditor.classList.remove('hidden');
    await loadProfileData();
  }
}

function setupEventListeners() {
  DOM.requestOtpBtn.addEventListener('click', async () => {
    if (await requestOtp()) {
      DOM.verifyOtpBtn.onclick = async () => {
        if (await verifyOtp()) {
          DOM.loginScreen.classList.add('hidden');
          DOM.profileEditor.classList.remove('hidden');
          await loadProfileData();
        }
      };
    }
  });
  
  DOM.backToEmailBtn.addEventListener('click', () => {
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
    document.querySelectorAll('.otp-inputs input').forEach(i => {
      i.value = '';
      i.disabled = false;
    });
  });
}

// Error handling
window.addEventListener('error', (event) => {
  console.error('Error:', event.error);
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: 'An unexpected error occurred',
    background: '#1e293b',
    color: '#f8fafc'
  });
});

// Start app
if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}