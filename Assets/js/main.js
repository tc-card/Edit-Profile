import { CONFIG, DOM, state } from './config.js';
import { setupOtpInputs, requestOtp, verifyOtp, checkExistingSession, logout } from './auth.js';
import { loadProfileData, renderProfileForm, renderQRCodeSection, renderSettingsSection, renderAnalyticsSection } from './profile.js';
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
      const sessionIsValid = await validateStoredSession();
      if (sessionIsValid) {
        showDashboard();
        await loadProfileData(); // Loads profile view by default
      } else {
        logout();
      }
    }
  } catch (error) {
    console.error('Initialization error:', error);
    await showAlert('error', 'Initialization Error', 'Failed to initialize application');
  }
}

async function validateStoredSession() {
  const token = state.currentUser.sessionToken || '';
  if (!token) return false;
  const response = await fetch(CONFIG.googleEditUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'verify_session', token })
  });
  if (!response.ok) throw new Error(`Session check failed (${response.status})`);
  const result = await response.json();
  if (!result.valid || result.email?.toLowerCase() !== state.currentUser.email?.toLowerCase()) return false;
  if (result.expiry) state.currentUser.expiry = Number(result.expiry);
  localStorage.setItem('profileEditorSession', JSON.stringify(state.currentUser));
  return true;
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
  const settingsLink = document.getElementById('sidebarSettingsLink');
  const analyticsLink = document.getElementById('sidebarAnalyticsLink');

  const setActiveLink = (activeLink) => {
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      const isActive = link === activeLink;
      link.classList.toggle('active', isActive);
      link.classList.toggle('text-gray-200', isActive);
      link.classList.toggle('text-gray-400', !isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  profileLink.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveLink(profileLink);
    renderProfileForm();
  });

  qrLink.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveLink(qrLink);
    renderQRCodeSection();
  });

  settingsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveLink(settingsLink);
    renderSettingsSection();
  });

  analyticsLink?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveLink(analyticsLink);
    renderAnalyticsSection();
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
