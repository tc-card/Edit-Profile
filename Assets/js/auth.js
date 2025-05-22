import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './utils.js';

// Setup OTP input fields behavior
export function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    
    inputs.forEach((input, index) => {
        // Add visual feedback classes
        input.classList.add('transition-all', 'duration-200', 'ease-in-out');
        
        // Paste handling
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim();
            if (/^\d{6}$/.test(pasteData)) {
                inputs.forEach((inp, i) => {
                    inp.value = pasteData[i] || '';
                    inp.classList.add('bg-blue-100', 'border-blue-400');
                    setTimeout(() => inp.classList.remove('bg-blue-100', 'border-blue-400'), 300);
                });
                inputs[5].focus();
            }
        });

        // Handle input with validation
        input.addEventListener('input', (e) => {
            input.value = input.value.replace(/\D/g, '').slice(0, 1);
            
            // Visual feedback
            if (input.value.length === 1) {
                input.classList.add('border-green-400', 'bg-green-50');
                setTimeout(() => input.classList.remove('border-green-400', 'bg-green-50'), 200);
            }
            
            if (input.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            
            // Auto-submit when all fields are filled
            if (index === inputs.length - 1 && input.value.length === 1) {
                const allFilled = Array.from(inputs).every(i => i.value.length === 1);
                if (allFilled) {
                    inputs.forEach(i => i.classList.add('verifying'));
                    DOM.verifyOtpBtn.click();
                }
            }
        });

        // Handle backspace and arrow navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                inputs[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        // Focus/blur effects
        input.addEventListener('focus', () => {
            input.classList.add('ring-2', 'ring-purple-300', 'border-purple-400');
        });
        
        input.addEventListener('blur', () => {
            input.classList.remove('ring-2', 'ring-purple-300', 'border-purple-400');
        });
    });
}

// Request OTP from server with countdown
export async function requestOtp() {
    const email = DOM.loginEmail.value.trim();
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        DOM.loginEmail.classList.add('border-red-500', 'shake');
        setTimeout(() => DOM.loginEmail.classList.remove('border-red-500', 'shake'), 1000);
        await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
        return false;
    }

    // Disable button and start countdown
    DOM.requestOtpBtn.disabled = true;
    DOM.requestOtpBtn.classList.add('opacity-75', 'cursor-not-allowed');
    
    let secondsLeft = 30;
    const originalBtnContent = DOM.requestOtpBtn.innerHTML;
    
    const countdownInterval = setInterval(() => {
        DOM.requestOtpBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <span class="btn-loader"></span>
                <span>Resend OTP in ${secondsLeft}s</span>
            </span>
        `;
        secondsLeft--;
        
        if (secondsLeft < 0) {
            clearInterval(countdownInterval);
            DOM.requestOtpBtn.disabled = false;
            DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            DOM.requestOtpBtn.innerHTML = originalBtnContent;
        }
    }, 1000);

    try {
        try {
            DOM.requestOtpBtn.innerHTML = `
                <span class="flex items-center justify-center">
                    <span class="btn-loader"></span>
                    <span>Sending OTP...</span>
                </span>
            `;
            
            const url = `${CONFIG.googleScriptUrl}?action=requestOtp&email=${encodeURIComponent(email)}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const result = await response.json();
                if (result.status === 'success') {
                    // Smooth transition between forms
                    DOM.emailForm.classList.add('opacity-0', 'h-0', 'overflow-hidden');
                    setTimeout(() => {
                        DOM.emailForm.classList.add('hidden');
                        DOM.otpForm.classList.remove('hidden');
                        DOM.otpForm.classList.add('opacity-0');
                        DOM.otpEmailDisplay.textContent = email;
                        
                        // Focus first OTP input
                        setTimeout(() => {
                            DOM.otpForm.classList.remove('opacity-0');
                            document.querySelector('.otp-inputs input')?.focus();
                        }, 50);
                    }, 300);
                    
                    return true;
                }
            }
        } catch (fetchError) {
            console.log('Regular fetch failed, trying JSONP');
        }

        // Fallback to JSONP if fetch fails
        return new Promise((resolve) => {
            const callbackName = `jsonp_${Date.now()}`;
            const url = `${CONFIG.googleScriptUrl}?action=requestOtp&email=${encodeURIComponent(email)}&callback=${callbackName}`;
            
            window[callbackName] = (response) => {
                clearInterval(countdownInterval);
                delete window[callbackName];
                if (document.body.contains(script)) {
                    document.body.removeChild(script);
                }
                
                if (response.status === 'success') {
                    DOM.emailForm.classList.add('hidden');
                    DOM.otpForm.classList.remove('hidden');
                    DOM.otpEmailDisplay.textContent = email;
                    document.querySelector('.otp-inputs input')?.focus();
                    resolve(true);
                } else {
                    DOM.requestOtpBtn.disabled = false;
                    DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    DOM.requestOtpBtn.innerHTML = originalBtnContent;
                    showAlert('error', 'Error', response.message || 'Failed to send OTP');
                    resolve(false);
                }
            };
            
            const script = document.createElement('script');
            script.src = url;
            script.onerror = () => {
                clearInterval(countdownInterval);
                delete window[callbackName];
                DOM.requestOtpBtn.disabled = false;
                DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                DOM.requestOtpBtn.innerHTML = originalBtnContent;
                showAlert('error', 'Connection Error', 'Failed to connect to server');
                resolve(false);
            };
            document.body.appendChild(script);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                if (window[callbackName]) {
                    clearInterval(countdownInterval);
                    delete window[callbackName];
                    if (document.body.contains(script)) {
                        document.body.removeChild(script);
                    }
                    DOM.requestOtpBtn.disabled = false;
                    DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    DOM.requestOtpBtn.innerHTML = originalBtnContent;
                    showAlert('error', 'Timeout', 'Server response timed out');
                    resolve(false);
                }
            }, 10000);
        });
    } catch (error) {
        clearInterval(countdownInterval);
        DOM.requestOtpBtn.disabled = false;
        DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        DOM.requestOtpBtn.innerHTML = originalBtnContent;
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
        inputs.forEach(input => {
            input.classList.add('shake', 'border-red-500');
            setTimeout(() => input.classList.remove('shake', 'border-red-500'), 1000);
        });
        await showAlert('error', 'Invalid OTP', 'Please enter a valid 6-digit code');
        return false;
    }

    try {
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('verifying', 'cursor-not-allowed');
        });
        
        DOM.backToEmailBtn.disabled = true;
        DOM.requestOtpBtn.disabled = true;
        
        DOM.verifyOtpBtn.disabled = true;
        DOM.verifyOtpBtn.classList.add('opacity-75', 'cursor-not-allowed');
        DOM.verifyOtpBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <span class="btn-loader"></span>
                <span>Verifying...</span>
            </span>
        `;
        
        const url = `${CONFIG.googleScriptUrl}?action=verifyOtp&email=${encodeURIComponent(email)}&otp=${otp}`;
        const response = await fetch(url);
        
        DOM.verifyOtpBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <span class="btn-loader"></span>
                <span>Logging in...</span>
            </span>
        `;
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Visual success feedback
            inputs.forEach(input => {
                input.classList.remove('verifying');
                input.classList.add('verified', 'border-green-500');
            });
            
            DOM.verifyOtpBtn.innerHTML = `
                <span class="flex items-center justify-center">
                    <i class="fas fa-check mr-2"></i>
                    <span>Success! Redirecting...</span>
                </span>
            `;
            
            state.currentUser = {
                email: result.profile.email,
                sessionToken: result.token,
                expiry: Date.now() + (CONFIG.sessionExpiryHours * 60 * 60 * 1000)
            };
            state.profileData = result.profile; 
            localStorage.setItem('profileEditorSession', JSON.stringify(state.currentUser));
            state.profileData = result.profile;
            
            return true;
        } else {
            // Visual error feedback
            inputs.forEach(input => {
                input.classList.remove('verifying');
                input.classList.add('shake', 'border-red-500');
                setTimeout(() => input.classList.remove('shake', 'border-red-500'), 1000);
            });
            
            DOM.verifyOtpBtn.disabled = false;
            DOM.verifyOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            DOM.verifyOtpBtn.innerHTML = 'Verify OTP';
            
            await showAlert('error', 'Error', result.message || 'Invalid OTP');
            inputs.forEach(input => {
                input.disabled = false;
                input.classList.remove('cursor-not-allowed');
            });
            return false;
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        
        // Visual error feedback
        inputs.forEach(input => {
            input.classList.remove('verifying');
            input.classList.add('shake', 'border-red-500');
            setTimeout(() => input.classList.remove('shake', 'border-red-500'), 1000);
        });
        
        DOM.verifyOtpBtn.disabled = false;
        DOM.verifyOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        DOM.verifyOtpBtn.innerHTML = 'Verify OTP';
        
        await showAlert('error', 'Network Error', 'Failed to connect to server');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('cursor-not-allowed');
        });
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
    DOM.emailForm.classList.remove('hidden', 'opacity-0', 'h-0');
    DOM.otpForm.classList.add('hidden');
    DOM.loginScreen.classList.remove('hidden');
    DOM.profileEditor.classList.add('hidden');
    DOM.loginEmail.value = '';
    document.querySelectorAll('.otp-inputs input').forEach(i => {
        i.value = '';
        i.classList.remove('verified', 'verifying', 'shake', 'border-red-500', 'border-green-500');
    });
    
    // Reset buttons
    DOM.requestOtpBtn.disabled = false;
    DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    DOM.requestOtpBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
    
    DOM.verifyOtpBtn.disabled = false;
    DOM.verifyOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    DOM.verifyOtpBtn.innerHTML = 'Verify OTP';
}