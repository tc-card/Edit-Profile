import { CONFIG, DOM, state } from './config.js';

const Swal = window.Swal;
const OTP_STORAGE_KEY = 'otp_verification';
const SESSION_KEY = 'profile_session';

export async function showAlert(icon, title, html) {
  await Swal.fire({
    icon,
    title,
    html,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#7c3aed'
  });
}

export function setupOtpInputs() {
  const otpInputs = document.querySelectorAll('.otp-inputs input');
  
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < 5) {
        otpInputs[index + 1].focus();
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && index > 0 && !e.target.value) {
        otpInputs[index - 1].focus();
      }
    });
  });
}

export async function requestOtp() {
  const email = DOM.loginEmail.value.trim();
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
    return false;
  }
  
  try {
    DOM.requestOtpBtn.disabled = true;
    DOM.requestOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=request_otp&email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify({
        email,
        expiry: Date.now() + (data.otpExpiry * 60000)
      }));
      
      state.currentUser.email = email;
      DOM.otpEmailDisplay.textContent = maskEmail(email);
      DOM.emailForm.classList.add('hidden');
      DOM.otpForm.classList.remove('hidden');
      document.querySelector('.otp-inputs input').focus();
      startOtpCountdown(data.otpExpiry * 60);
      return true;
    }
    throw new Error(data.message || 'Failed to send OTP');
  } catch (error) {
    await showAlert('error', 'Error', error.message);
    return false;
  } finally {
    DOM.requestOtpBtn.disabled = false;
    DOM.requestOtpBtn.textContent = 'Send OTP';
  }
}

export async function verifyOtp() {
  const otp = Array.from(document.querySelectorAll('.otp-inputs input'))
    .map(input => input.value)
    .join('');
  
  if (otp.length !== 6) {
    await showAlert('error', 'Invalid OTP', 'Please enter the full 6-digit code');
    return false;
  }
  
  try {
    DOM.verifyOtpBtn.disabled = true;
    DOM.verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    
    const otpData = JSON.parse(sessionStorage.getItem(OTP_STORAGE_KEY)) || {};
    if (!otpData.email) throw new Error('Session expired');
    
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=verify_otp&email=${encodeURIComponent(otpData.email)}&otp=${otp}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      state.currentUser = {
        email: otpData.email,
        sessionToken: data.sessionToken
      };
      
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        email: otpData.email,
        token: data.sessionToken,
        expiry: Date.now() + 3600000 // 1 hour
      }));
      
      return true;
    }
    throw new Error(data.message || 'Invalid OTP');
  } catch (error) {
    await showAlert('error', 'Error', error.message || 'Authentication failed');
    return false;
  } finally {
    DOM.verifyOtpBtn.disabled = false;
    DOM.verifyOtpBtn.textContent = 'Verify OTP';
  }
}

export function checkExistingSession() {
  const session = JSON.parse(localStorage.getItem(SESSION_KEY));
  if (session && new Date(session.expiry) > new Date()) {
    state.currentUser = {
      email: session.email,
      sessionToken: session.token
    };
    return true;
  }
  return false;
}

// Helper functions
function maskEmail(email) {
  const [name, domain] = email.split('@');
  return `${name.substring(0, 2)}****@${domain}`;
}

function startOtpCountdown(seconds) {
  const timerElement = document.createElement('div');
  timerElement.className = 'text-sm text-red-400 mb-2';
  DOM.otpForm.insertBefore(timerElement, DOM.otpForm.firstChild);
  
  const interval = setInterval(() => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerElement.textContent = `OTP expires in: ${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    
    if (--seconds < 0) {
      clearInterval(interval);
      timerElement.textContent = 'OTP expired. Please request a new one.';
      document.querySelectorAll('.otp-inputs input').forEach(i => i.disabled = true);
    }
  }, 1000);
}