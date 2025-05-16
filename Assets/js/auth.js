import { CONFIG, DOM, state } from './config.js';

const Swal = window.Swal;

export async function showAlert(icon, title, text) {
  await Swal.fire({
    icon,
    title,
    text,
    background: '#1e293b',
    color: '#f8fafc',
    confirmButtonColor: '#7c3aed'
  });
}

export function setupOtpInputs() {
  const otpContainer = document.createElement('div');
  otpContainer.className = 'otp-inputs flex gap-2 mb-4 justify-center';
  
  for (let i = 0; i < 6; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.dataset.index = i;
    input.className = 'w-12 h-12 text-center text-xl rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500';
    otpContainer.appendChild(input);
  }
  
  DOM.otpForm.insertBefore(otpContainer, DOM.verifyOtpBtn);
  
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
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
    return false;
  }
  
  try {
    DOM.requestOtpBtn.disabled = true;
    DOM.requestOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=request_otp&email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      state.currentUser.email = email;
      DOM.otpEmailDisplay.textContent = email;
      DOM.emailForm.classList.add('hidden');
      DOM.otpForm.classList.remove('hidden');
      document.querySelector('.otp-inputs input').focus();
      return true;
    } else {
      throw new Error(data.message || 'Failed to send OTP');
    }
  } catch (error) {
    await showAlert('error', 'Error', error.message || 'Failed to send OTP');
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
    
    const response = await fetch(`${CONFIG.googleScriptUrl}?action=verify_otp&email=${encodeURIComponent(state.currentUser.email)}&otp=${otp}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      state.currentUser.sessionToken = data.sessionToken;
      await showAlert('success', 'Verified', 'You can now edit your profile');
      return true;
    } else {
      throw new Error(data.message || 'Invalid OTP');
    }
  } catch (error) {
    await showAlert('error', 'Error', error.message || 'Invalid OTP');
    return false;
  } finally {
    DOM.verifyOtpBtn.disabled = false;
    DOM.verifyOtpBtn.textContent = 'Verify OTP';
  }
}