import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './utils.js';

// Setup OTP input fields behavior
export function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    
    inputs.forEach((input, index) => {
        // Handle input
        input.addEventListener('input', (e) => {
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

// Request OTP from server (using GET)
// Request OTP from server (using JSONP workaround)
export async function requestOtp() {
  const email = DOM.loginEmail.value.trim();
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
      return false;
  }

  try {
      // Use JSONP approach
      const callbackName = `jsonp_${Date.now()}`;
      const url = `${CONFIG.googleScriptUrl}?action=requestOtp&email=${encodeURIComponent(email)}&callback=${callbackName}`;
      
      return new Promise((resolve) => {
          window[callbackName] = (response) => {
              delete window[callbackName];
              
              if (response.status === 'success') {
                  DOM.emailForm.classList.add('hidden');
                  DOM.otpForm.classList.remove('hidden');
                  DOM.otpEmailDisplay.textContent = email;
                  resolve(true);
              } else {
                  showAlert('error', 'Error', response.message || 'Failed to send OTP');
                  resolve(false);
              }
          };
          
          // Create script tag to make JSONP request
          const script = document.createElement('script');
          script.src = url;
          document.body.appendChild(script);
          
          // Fallback timeout
          setTimeout(() => {
              if (window[callbackName]) {
                  delete window[callbackName];
                  showAlert('error', 'Timeout', 'Server response timed out');
                  resolve(false);
              }
          }, 10000);
      });
  } catch (error) {
      console.error('OTP request error:', error);
      await showAlert('error', 'Network Error', 'Failed to connect to server');
      return false;
  }
}

// Verify OTP with server (using GET)
export async function verifyOtp() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    const otp = Array.from(inputs).map(input => input.value).join('');
    const email = DOM.otpEmailDisplay.textContent;

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        await showAlert('error', 'Invalid OTP', 'Please enter a valid 6-digit code');
        return false;
    }

    try {
        inputs.forEach(input => input.disabled = true);
        
        const url = `${CONFIG.googleScriptUrl}?action=verifyOtp&email=${encodeURIComponent(email)}&otp=${otp}`;
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
            state.currentUser = {
                email: result.profile.email,
                sessionToken: result.token,
                expiry: Date.now() + (CONFIG.sessionExpiryHours * 60 * 60 * 1000)
            };
            localStorage.setItem('profileEditorSession', JSON.stringify(state.currentUser));
            state.profileData = result.profile;
            return true;
        } else {
            await showAlert('error', 'Error', result.message || 'Invalid OTP');
            inputs.forEach(input => input.disabled = false);
            return false;
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        await showAlert('error', 'Network Error', 'Failed to connect to server');
        inputs.forEach(input => input.disabled = false);
        return false;
    }
}

// Check for existing valid session
export function checkExistingSession() {
    const sessionData = localStorage.getItem('profileEditorSession');
    if (!sessionData) return false;
    
    try {
        const session = JSON.parse(sessionData);
        return session.expiry > Date.now();
    } catch (e) {
        return false;
    }
}

// Logout user
export function logout() {
    localStorage.removeItem('profileEditorSession');
    state.currentUser = { email: null, sessionToken: null, expiry: null };
    state.profileData = null;
    
    // Reset forms and show login screen
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
    DOM.loginScreen.classList.remove('hidden');
    DOM.profileEditor.classList.add('hidden');
    DOM.loginEmail.value = '';
    document.querySelectorAll('.otp-inputs input').forEach(i => i.value = '');
}