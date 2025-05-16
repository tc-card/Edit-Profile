import { CONFIG, DOM } from './config.js';

// State
let currentUser = {
  email: null,
  sessionToken: null
};

// OTP Input Handling
function setupOtpInputs() {
  const otpInputs = document.querySelectorAll('.otp-inputs input');
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      if (e.target.value.length === 1 && index < otpInputs.length - 1) {
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

// Request OTP
async function requestOtp() {
  const email = DOM.loginEmail.value.trim();
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address');
    return;
  }
  
  DOM.requestOtpBtn.disabled = true;
  DOM.requestOtpBtn.textContent = 'Sending...';
  
  try {
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=request_otp&email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      currentUser.email = email;
      DOM.otpEmailDisplay.textContent = email;
      DOM.emailForm.classList.add('hidden');
      DOM.otpForm.classList.remove('hidden');
      document.querySelector('.otp-inputs input').focus();
    } else {
      throw new Error(data.message || 'Error sending OTP');
    }
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'An error occurred. Please try again.');
  } finally {
    DOM.requestOtpBtn.disabled = false;
    DOM.requestOtpBtn.textContent = 'Send OTP';
  }
}

// Verify OTP
async function verifyOtp() {
  const otp = Array.from(document.querySelectorAll('.otp-inputs input'))
    .map(input => input.value).join('');
  
  if (otp.length !== 6) {
    alert('Please enter the full 6-digit OTP');
    return;
  }
  
  DOM.verifyOtpBtn.disabled = true;
  DOM.verifyOtpBtn.textContent = 'Verifying...';
  
  try {
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=verify_otp&email=${encodeURIComponent(currentUser.email)}&otp=${otp}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      currentUser.sessionToken = data.sessionToken;
      DOM.loginScreen.classList.add('hidden');
      DOM.profileEditor.classList.remove('hidden');
      // Load profile data
    } else {
      throw new Error(data.message || 'Invalid OTP');
    }
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'An error occurred. Please try again.');
  } finally {
    DOM.verifyOtpBtn.disabled = false;
    DOM.verifyOtpBtn.textContent = 'Verify OTP';
  }
}

// Initialize Auth
function initAuth() {
  setupOtpInputs();
  DOM.requestOtpBtn.addEventListener('click', requestOtp);
  DOM.verifyOtpBtn.addEventListener('click', verifyOtp);
  DOM.backToEmailBtn.addEventListener('click', () => {
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
  });
}

export { initAuth, currentUser };