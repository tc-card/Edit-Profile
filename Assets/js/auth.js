import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './utils.js';

// Setup OTP input fields behavior
export function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    
    inputs.forEach((input, index) => {
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim();
            if (/^\d{6}$/.test(pasteData)) {
                inputs.forEach((input, i) => {
                    input.value = pasteData[i] || '';
                    if (i === 5) input.focus();
                });
            }
        });

        // Handle input
        input.addEventListener('input', (e) => {
            if (input.value.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    input.blur();
                }
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

// Request OTP from server
export async function requestOtp() {
    const email = DOM.loginEmail.value.trim();
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
        return false;
    }

    try {
        const response = await fetch(`${CONFIG.googleScriptUrl}?action=requestOtp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            DOM.emailForm.classList.add('hidden');
            DOM.otpForm.classList.remove('hidden');
            DOM.otpEmailDisplay.textContent = email;
            return true;
        } else {
            await showAlert('error', 'Error', result.message || 'Failed to send OTP');
            return false;
        }
    } catch (error) {
        console.error('OTP request error:', error);
        await showAlert('error', 'Network Error', 'Failed to connect to server');
        return false;
    }
}

// Verify OTP with server
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
        
        const response = await fetch(`${CONFIG.googleScriptUrl}?action=verifyOtp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            // Store session data
            state.currentUser = {
                email: result.profile.email,
                sessionToken: result.token,
                expiry: Date.now() + (CONFIG.sessionExpiryHours * 60 * 60 * 1000)
            };
            
            // Store in localStorage for persistence
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
    
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            
            if (session.expiry > Date.now()) {
                state.currentUser = session;
                return true;
            }
        } catch (e) {
            console.error('Session parse error:', e);
        }
    }
    
    return false;
}

// Logout user
export function logout() {
    localStorage.removeItem('profileEditorSession');
    state.currentUser = {
        email: null,
        sessionToken: null,
        expiry: null
    };
    state.profileData = null;
    
    // Reset forms
    DOM.emailForm.classList.remove('hidden');
    DOM.otpForm.classList.add('hidden');
    DOM.loginEmail.value = '';
    document.querySelectorAll('.otp-inputs input').forEach(i => i.value = '');
    
    // Show login screen
    DOM.loginScreen.classList.remove('hidden');
    DOM.profileEditor.classList.add('hidden');
}