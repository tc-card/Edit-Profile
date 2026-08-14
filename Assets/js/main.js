import { DOM } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp, checkExistingSession, logout } from './auth.js';
import { loadProfileData, renderProfileForm, renderQRCodeSection } from './profile.js';
import { showAlert } from './utils.js';

function showDashboard() {
  DOM.loginScreen.classList.add('hidden');
  DOM.dashboard.classList.remove('hidden');
}

async function initApp() {
  try {
    setupOtpInputs();
    setupEventListeners();
    setupSidebarNavigation();
    
    if (checkExistingSession()) {
      showDashboard();
      await loadProfileData(); // Loads profile view by default
    }
  } catch (error) {
    console.error('Initialization error:', error);
    await showAlert('error', 'Initialization Error', 'Failed to initialize application');
  }
}

function setupEventListeners() {
  // OTP Request
  DOM.requestOtpBtn.addEventListener('click', async () => {
    await requestOtp();
  });

  DOM.verifyOtpBtn.addEventListener('click', async () => {
    if (await verifyOtp()) {
      showDashboard();
      await loadProfileData();
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

    // Reset OTP button state immediately
    clearInterval(window.countdownInterval);
    DOM.requestOtpBtn.disabled = false;
    DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    DOM.requestOtpBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Send OTP`;

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
  });

  // Enter key submits email form
  DOM.loginEmail.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await requestOtp();
    }
  });
}

// NEW: Handles switching between Profile and QR Code tabs
function setupSidebarNavigation() {
  const profileLink = document.getElementById('sidebarProfileLink');
  const qrLink = document.getElementById('sidebarQRCodeLink');

  profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active', 'text-gray-200', 'border-l-3'));
    profileLink.classList.add('active', 'text-gray-200');
    renderProfileForm(); // Back to profile
    // Re-initialize forms and preview
    import('./profile.js').then(module => {
        module.initializeForm?.();
    });
  });

  qrLink.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active', 'text-gray-200', 'border-l-3'));
    qrLink.classList.add('active', 'text-gray-200');
    renderQRCodeSection(); // Show QR generator
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