// Toggle password visibility for individual fields
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const messageContainer = document.getElementById('messageContainer');
    const form = document.getElementById('registerForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Toggle password field visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Toggle confirm password field visibility
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Password strength checker
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);

            if (password.length === 0) {
                passwordStrength.textContent = '';
                passwordStrength.style.color = '';
                return;
            }

            switch(strength.level) {
                case 'weak':
                    passwordStrength.textContent = '⚠️ Weak password: ' + strength.message;
                    passwordStrength.style.color = '#e74c3c';
                    break;
                case 'medium':
                    passwordStrength.textContent = '⚡ Medium password: ' + strength.message;
                    passwordStrength.style.color = '#f39c12';
                    break;
                case 'strong':
                    passwordStrength.textContent = '✓ Strong password';
                    passwordStrength.style.color = '#27ae60';
                    break;
            }
        });
    }

    // Input sanitization helper - protects against XSS
    function sanitizeInput(input) {
        if (!input) return '';

        // Create a temporary element to leverage browser's HTML encoding
        const temp = document.createElement('div');
        temp.textContent = input.trim();
        return temp.innerHTML;
    }

    // Email validation helper - more robust regex
    function isValidEmail(email) {
        // RFC 5322 compliant email validation (simplified but robust)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254; // RFC 5321 max length
    }

    // Password strength validation
    function checkPasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return { level: 'weak', message: 'At least 8 characters required' };
        }

        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

        if (strength < 2) {
            return { level: 'weak', message: 'Add uppercase, numbers, or special characters' };
        } else if (strength < 4) {
            return { level: 'medium', message: 'Add more variety for better security' };
        } else {
            return { level: 'strong', message: '' };
        }
    }

    // Show message to user
    function showMessage(message, type) {
        messageContainer.style.display = 'block';
        messageContainer.textContent = message;

        if (type === 'error') {
            messageContainer.style.backgroundColor = '#fee';
            messageContainer.style.color = '#c33';
            messageContainer.style.border = '1px solid #fcc';
        } else if (type === 'success') {
            messageContainer.style.backgroundColor = '#efe';
            messageContainer.style.color = '#3c3';
            messageContainer.style.border = '1px solid #cfc';
        } else if (type === 'warning') {
            messageContainer.style.backgroundColor = '#ffeaa7';
            messageContainer.style.color = '#d63031';
            messageContainer.style.border = '1px solid #fdcb6e';
        }

        // Scroll to message
        messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Hide message
    function hideMessage() {
        messageContainer.style.display = 'none';
    }

    // Check if HTTPS is being used
    function isSecureConnection() {
        return window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    // Handle form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessage();

        // Check for secure connection (ENFORCE, don't just warn)
        if (!isSecureConnection()) {
            showMessage('🔒 Error: This form must be submitted over HTTPS for security. Please access this site via https://', 'error');
            return; // Block submission over HTTP
        }

        // Get form elements with null checks
        const usernameInput = form.querySelector('input[name="username"]');
        const emailInput = form.querySelector('input[name="email"]');
        const passwordInput = form.querySelector('input[name="password"]');
        const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');
        const authorizedPersonInput = form.querySelector('input[name="authorizedPerson"]');
        const authorizedEmailInput = form.querySelector('input[name="authorizedEmail"]');
        const agreeCheckbox = document.getElementById('agree');

        // Validate all required elements exist
        if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !agreeCheckbox) {
            showMessage('Error: Form elements are missing. Please refresh the page and try again.', 'error');
            return;
        }

        // Get and sanitize form data
        const username = sanitizeInput(usernameInput.value);
        const email = sanitizeInput(emailInput.value);
        const password = passwordInput.value; // Don't sanitize password - allow all characters
        const confirmPassword = confirmPasswordInput.value;
        const authorizedPerson = authorizedPersonInput ? sanitizeInput(authorizedPersonInput.value) : '';
        const authorizedEmail = authorizedEmailInput ? sanitizeInput(authorizedEmailInput.value) : '';

        // Validate username
        if (username.length < 3) {
            showMessage('Username must be at least 3 characters long.', 'error');
            return;
        }

        if (username.length > 30) {
            showMessage('Username must be no more than 30 characters long.', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            showMessage('Username can only contain letters, numbers, underscores, and hyphens.', 'error');
            return;
        }

        // Validate email
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }

        // Validate password strength - require at least medium strength
        const passwordCheck = checkPasswordStrength(password);
        if (passwordCheck.level === 'weak' || passwordCheck.level === 'medium') {
            showMessage('Password must be strong. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.', 'error');
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            showMessage('Passwords do not match. Please try again.', 'error');
            return;
        }

        // Validate authorized email if authorized person is provided
        if (authorizedPerson && !authorizedEmail) {
            showMessage('Please provide an email for the authorized person.', 'error');
            return;
        }

        if (authorizedEmail && !isValidEmail(authorizedEmail)) {
            showMessage('Please enter a valid authorized email address.', 'error');
            return;
        }

        // Validate terms agreement
        if (!agreeCheckbox.checked) {
            showMessage('Please agree to the Terms of Service and Privacy Policy.', 'error');
            return;
        }

        // Prepare data for API
        const formData = {
            username: username,
            email: email,
            password: password,
            authorizedPerson: authorizedPerson || null,
            authorizedEmail: authorizedEmail || null
        };

        // Disable submit button and show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Creating Account...';

        try {
            // Get CSRF token if available (from meta tag)
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add CSRF token to headers if available
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken.getAttribute('content');
            }

            // Submit to API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData),
                credentials: 'same-origin' // Include cookies for session-based CSRF
            });

            // Handle response
            if (response.ok) {
                const data = await response.json();
                showMessage('✓ Account created successfully! Redirecting to login...', 'success');

                // Redirect after a short delay to let user see the message
                setTimeout(() => {
                    window.location.href = 'mvpV3.html';
                }, 1500);
            } else {
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showMessage('Registration failed: ' + (data.message || 'Unknown error'), 'error');
                } else {
                    // Non-JSON error response
                    const text = await response.text();
                    showMessage('Registration failed: ' + (text || 'Server error (status ' + response.status + ')'), 'error');
                }

                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Error during registration:', error);
            showMessage('An error occurred during registration. Please check your connection and try again.', 'error');

            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
