import { CONFIG, DOM, state } from './config.js';
import { showAlert } from './utils.js';

// Enhanced OTP input setup with better visual feedback
export function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    const ANIMATION_DURATION = 200;
    const INPUT_CLASSES = {
        base: ['transition-all', 'duration-200', 'ease-in-out', 'text-center', 'text-xl', 'font-medium', 'bg-gray-800'],
        focus: ['ring-2', 'ring-purple-300', 'border-purple-400', 'shadow-lg'],
        success: ['border-green-400', 'bg-green-50', 'transform', 'scale-105'],
        paste: ['bg-blue-50', 'border-blue-400', 'transform', 'scale-105'],
        disabled: ['verifying', 'cursor-not-allowed']
    };

    const applyClasses = (element, classes, remove = false) => {
        element.classList[remove ? 'remove' : 'add'](...classes);
    };

    const animateInput = (input, classes) => {
        applyClasses(input, classes);
        setTimeout(() => applyClasses(input, classes, true), ANIMATION_DURATION);
    };

    inputs.forEach((input, index) => {
        // Apply base styling
        applyClasses(input, INPUT_CLASSES.base);

        // Enhanced paste handling with validation
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').trim();
            
            if (/^\d{6}$/.test(pasteData)) {
                inputs.forEach((inp, i) => {
                    inp.value = pasteData[i] || '';
                    animateInput(inp, INPUT_CLASSES.paste);
                });
                inputs[inputs.length - 1].focus();
            }
        });

        // Smart input handling with validation and auto-focus
        input.addEventListener('input', (e) => {
            const sanitizedValue = input.value.replace(/\D/g, '').slice(0, 1);
            input.value = sanitizedValue;

            if (sanitizedValue) {
                animateInput(input, INPUT_CLASSES.success);
                
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    const isComplete = Array.from(inputs).every(i => i.value.length === 1);
                    if (isComplete) {
                        inputs.forEach(i => {
                            applyClasses(i, INPUT_CLASSES.disabled);
                            i.disabled = true;
                        });
                        requestAnimationFrame(() => DOM.verifyOtpBtn.click());
                    }
                }
            }
        });

        // Advanced keyboard navigation
        input.addEventListener('keydown', (e) => {
            const keyHandlers = {
                'Backspace': () => !input.value && index > 0 && inputs[index - 1].focus(),
                'ArrowLeft': () => index > 0 && inputs[index - 1].focus(),
                'ArrowRight': () => index < inputs.length - 1 && inputs[index + 1].focus(),
                'Tab': (e) => {
                    if (e.shiftKey && index > 0) {
                        e.preventDefault();
                        inputs[index - 1].focus();
                    } else if (!e.shiftKey && index < inputs.length - 1) {
                        e.preventDefault();
                        inputs[index + 1].focus();
                    }
                }
            };

            keyHandlers[e.key]?.(e);
        });

        // Enhanced focus management
        input.addEventListener('focus', () => applyClasses(input, INPUT_CLASSES.focus));
        input.addEventListener('blur', () => applyClasses(input, INPUT_CLASSES.focus, true));
    });
}

// Enhanced OTP request with better UI states
export async function requestOtp() {
    const email = DOM.loginEmail.value.trim();
    
    // Enhanced email validation with better feedback
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        DOM.loginEmail.classList.add('border-red-500', 'shake', 'bg-red-50');
        setTimeout(() => {
            DOM.loginEmail.classList.remove('border-red-500', 'shake', 'bg-red-50');
        }, 1000);
        await showAlert('error', 'Invalid Email', 'Please enter a valid email address');
        return false;
    }

    // Improved button states
    DOM.requestOtpBtn.disabled = true;
    DOM.requestOtpBtn.classList.add('opacity-75', 'cursor-not-allowed');
    const originalBtnContent = DOM.requestOtpBtn.innerHTML;
    DOM.requestOtpBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <i class="fas fa-spinner fa-spin"></i>
            <span>Sending OTP...</span>
        </span>
    `;
    
    // Add loading state to email input
    DOM.loginEmail.classList.add('loading');
    DOM.loginEmail.readOnly = true;

    try {
        const url = `${CONFIG.googleScriptUrl}?action=requestOtp&email=${encodeURIComponent(email)}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            // Success transition with animation
            DOM.emailForm.classList.add('opacity-0', 'h-0', 'overflow-hidden');
            setTimeout(() => {
                DOM.emailForm.classList.add('hidden');
                DOM.otpForm.classList.remove('hidden');
                DOM.otpForm.classList.add('opacity-0');
                DOM.otpEmailDisplay.textContent = email;
                
                setTimeout(() => {
                    DOM.otpForm.classList.remove('opacity-0');
                    document.querySelector('.otp-inputs input')?.focus();
                }, 50);
            }, 300);

            // Start countdown timer
            startOtpCountdown();
            return true;
        } else {
            // Handle specific backend errors with appropriate UI feedback
            handleOtpRequestError(result.message);
            return false;
        }
    } catch (error) {
        console.error('OTP request error:', error);
        await showAlert('error', 'Network Error', 'Failed to connect to server');
        return false;
    } finally {
        DOM.loginEmail.classList.remove('loading');
        DOM.loginEmail.readOnly = false;
    }
}
// Helper function: Handle OTP request errors
async function handleOtpRequestError(message) {
    DOM.requestOtpBtn.disabled = false;
    DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');

    // Specific error messages
    const errorMessages = {
        'No profile found with this email': 'No profile found with this email. Please check your email and try again.',
        'Too many requests': 'Too many requests. Please try again later.',
    }
    await showAlert('error', 'Error', errorMessages[message] || message);
    
    // Restore original button content
    DOM.requestOtpBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Resend OTP`;
}
// Enhanced OTP verification with better UI states
export async function verifyOtp() {
    const inputs = document.querySelectorAll('.otp-inputs input');
    const otp = Array.from(inputs).map(input => input.value).join('');
    const email = DOM.otpEmailDisplay.textContent;

    // Enhanced OTP validation
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        inputs.forEach(input => {
            input.classList.add('shake', 'border-red-500', 'bg-red-50');
            setTimeout(() => input.classList.remove(
                'shake', 'border-red-500', 'bg-red-50'
            ), 1000);
        });
        await showAlert('error', 'Invalid OTP', 'Please enter a valid 6-digit code');
        return false;
    }

    // Set verifying state
    setVerifyingState(true);

    try {
        const url = `${CONFIG.googleScriptUrl}?action=verifyOtp&email=${encodeURIComponent(email)}&otp=${otp}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.status === 'success') {
            // Success state with visual confirmation
            await handleSuccessfulVerification(result, inputs);
            return true;
        } else {
            // Enhanced error handling
            await handleVerificationError(result.message, inputs);
            return false;
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        await showAlert('error', 'Network Error', 'Failed to connect to server');
        return false;
    } finally {
        setVerifyingState(false);
    }
}

// Helper function: Start OTP countdown timer
function startOtpCountdown() {
    let secondsLeft = 60;
    const originalBtnContent = DOM.requestOtpBtn.innerHTML;
    let countdownInterval;

    // Clear any existing interval before starting new one
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownInterval = setInterval(() => {
        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            DOM.requestOtpBtn.disabled = false;
            DOM.requestOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            DOM.requestOtpBtn.innerHTML = originalBtnContent;
            return;
        }

        DOM.requestOtpBtn.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <i class="far fa-clock"></i>
                <span>Resend in ${secondsLeft}s</span>
            </span>
        `;
        secondsLeft--;
    }, 1000);
}

// Helper function: Set verifying state
function setVerifyingState(isVerifying) {
    const inputs = document.querySelectorAll('.otp-inputs input');
    inputs.forEach(input => {
        input.disabled = isVerifying;
        input.classList.toggle('verifying', isVerifying);
        input.classList.toggle('cursor-not-allowed', isVerifying);
    });
    
    DOM.backToEmailBtn.disabled = isVerifying;
    DOM.requestOtpBtn.disabled = isVerifying;
    DOM.verifyOtpBtn.disabled = isVerifying;
    
    if (isVerifying) {
        DOM.verifyOtpBtn.classList.add('opacity-75', 'cursor-not-allowed');
        DOM.verifyOtpBtn.innerHTML = `
            <span class="flex items-center justify-center gap-2">
                <span class="btn-loader"></span>
                <span>Verifying...</span>
            </span>
        `;
    } else {
        DOM.verifyOtpBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        DOM.verifyOtpBtn.innerHTML = 'Verify OTP';
    }
}

// Helper function: Handle successful verification
async function handleSuccessfulVerification(result, inputs) {
    inputs.forEach(input => {
        input.classList.remove('verifying');
        input.classList.add('verified', 'border-green-500', 'bg-green-50');
    });
    
    DOM.verifyOtpBtn.innerHTML = `
        <span class="flex items-center justify-center gap-2">
            <i class="fas fa-check-circle text-green-500"></i>
            <span>Success! Redirecting...</span>
        </span>
    `;
    
    // Store session data
    state.currentUser = {
        email: result.profile.email,
        sessionToken: result.token,
        expiry: Date.now() + (CONFIG.sessionExpiryHours * 60 * 60 * 1000)
    };
    state.profileData = result.profile;
    localStorage.setItem('profileEditorSession', JSON.stringify(state.currentUser));
    
    // Add success animation before redirect
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Helper function: Handle verification errors
async function handleVerificationError(message, inputs) {
    // Determine error type for specific feedback
    const errorType = message.includes('expired') ? 'expired' : 
                     message.includes('Invalid') ? 'invalid' : 'generic';
    
    // Visual feedback based on error type
    inputs.forEach(input => {
        input.classList.remove('verifying');
        input.classList.add('shake', 'border-red-500', 'bg-red-50');
        setTimeout(() => input.classList.remove(
            'shake', 'border-red-500', 'bg-red-50'
        ), 1000);
    });
    
    // Specific error messages
    const errorMessages = {
        expired: 'This code has expired. Please request a new one.',
        invalid: 'The code you entered is incorrect. Please try again.',
        generic: message || 'Verification failed. Please try again.'
    };
    
    await showAlert('error', 'Verification Failed', errorMessages[errorType]);
    
    // Clear inputs for invalid codes (but keep for expired)
    if (errorType === 'invalid') {
        inputs.forEach(input => {
            input.value = '';
            input.disabled = false;
            input.classList.remove('cursor-not-allowed');
        });
        inputs[0].focus();
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