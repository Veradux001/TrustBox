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

    // Input sanitization helper
    function sanitizeInput(input) {
        return input.trim().replace(/[<>]/g, '');
    }

    // Email validation helper
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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

        // Check for secure connection
        if (!isSecureConnection()) {
            showMessage('⚠️ Warning: You are not using a secure connection (HTTPS). Your password may be transmitted insecurely.', 'warning');
            // Continue anyway, but warn user
        }

        // Get and sanitize form data
        const username = sanitizeInput(form.querySelector('input[name="username"]').value);
        const email = sanitizeInput(form.querySelector('input[name="email"]').value);
        const password = form.querySelector('input[name="password"]').value;
        const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;
        const authorizedPerson = sanitizeInput(form.querySelector('input[name="authorizedPerson"]').value);
        const authorizedEmail = sanitizeInput(form.querySelector('input[name="authorizedEmail"]').value);
        const agreeCheckbox = document.getElementById('agree');

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

        // Validate password strength
        const passwordCheck = checkPasswordStrength(password);
        if (passwordCheck.level === 'weak') {
            showMessage('Password is too weak. ' + passwordCheck.message, 'error');
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
            // Submit to API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
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
