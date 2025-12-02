// API Configuration
const API_BASE_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('myInput');
    const togglePassword = document.getElementById('togglePassword');
    const showPasswordCheckbox = document.getElementById('showPasswordCheckbox');
    const messageContainer = document.getElementById('messageContainer');
    const form = document.getElementById('loginForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Toggle password visibility with eye icon
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            myFunction();
        });
    }

    // Toggle password visibility with checkbox
    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            myFunction();
        });
    }

    // Password visibility toggle function
    function myFunction() {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            if (togglePassword) {
                togglePassword.classList.remove('fa-eye');
                togglePassword.classList.add('fa-eye-slash');
            }
            if (showPasswordCheckbox) {
                showPasswordCheckbox.checked = true;
            }
        } else {
            passwordInput.type = "password";
            if (togglePassword) {
                togglePassword.classList.remove('fa-eye-slash');
                togglePassword.classList.add('fa-eye');
            }
            if (showPasswordCheckbox) {
                showPasswordCheckbox.checked = false;
            }
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
            showMessage('🔒 Error: Login must be done over HTTPS for security.', 'error');
            return;
        }

        // Get form data
        const emailInput = form.querySelector('input[name="email"]');
        const passwordInput = form.querySelector('input[name="password"]');

        if (!emailInput || !passwordInput) {
            showMessage('Error: Form elements are missing. Please refresh the page.', 'error');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Basic validation
        if (!email || !password) {
            showMessage('Please enter both email and password.', 'error');
            return;
        }

        // Prepare data for API
        const loginData = {
            email: email,
            password: password
        };

        // Disable submit button and show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Signing In...';

        try {
            // Submit to API
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'same-origin'
            });

            // Handle response
            if (response.ok) {
                const data = await response.json();

                // Store user info in localStorage for session management
                localStorage.setItem('trustbox_user', JSON.stringify(data.user));
                localStorage.setItem('trustbox_logged_in', 'true');

                showMessage('✓ Login successful! Redirecting...', 'success');

                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'mvpV3.html';
                }, 1000);
            } else {
                // Handle error response
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showMessage(data.message || 'Login failed. Please try again.', 'error');
                } else {
                    const text = await response.text();
                    showMessage(text || 'Login failed. Please check your credentials.', 'error');
                }

                // Re-enable submit button
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Error during login:', error);
            showMessage('An error occurred during login. Please check your connection and try again.', 'error');

            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
