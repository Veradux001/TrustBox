// API Configuratie - automatisch detecteren van omgeving
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : `${window.location.protocol}//${window.location.hostname}/api`;

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('myInput');
    const togglePassword = document.getElementById('togglePassword');
    const showPasswordCheckbox = document.getElementById('showPasswordCheckbox');
    const messageContainer = document.getElementById('messageContainer');
    const form = document.getElementById('loginForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Schakel wachtwoord zichtbaarheid met oogicoon
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            myFunction();
        });
    }

    // Schakel wachtwoord zichtbaarheid met checkbox
    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            myFunction();
        });
    }

    // Functie voor wachtwoord zichtbaarheid schakelen
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

    // Toon melding aan gebruiker
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

        // Scroll naar melding
        messageContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Verberg melding
    function hideMessage() {
        messageContainer.style.display = 'none';
    }

    // Controleer of HTTPS wordt gebruikt
    function isSecureConnection() {
        return window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    // Behandel formulier inzending
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideMessage();

        // Controleer op veilige verbinding
        if (!isSecureConnection()) {
            showMessage('🔒 Fout: Login moet via HTTPS gebeuren voor beveiliging.', 'error');
            return;
        }

        // Haal formulierdata op
        const emailInput = form.querySelector('input[name="email"]');
        const passwordInput = form.querySelector('input[name="password"]');

        if (!emailInput || !passwordInput) {
            showMessage('Fout: Formulierelementen ontbreken. Ververs de pagina.', 'error');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Basis validatie
        if (!email || !password) {
            showMessage('Vul zowel e-mail als wachtwoord in.', 'error');
            return;
        }

        // Bereid data voor API voor
        const loginData = {
            email: email,
            password: password
        };

        // Schakel verzendknop uit en toon laadstatus
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Inloggen...';

        try {
            // Verstuur naar API
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(loginData),
                credentials: 'same-origin'
            });

            // Behandel response
            if (response.ok) {
                const data = await response.json();

                // Sla gebruikersinformatie op in localStorage voor sessiebeheer
                localStorage.setItem('trustbox_user', JSON.stringify(data.user));
                localStorage.setItem('trustbox_logged_in', 'true');

                showMessage('✓ Login succesvol! Doorverwijzen...', 'success');

                // Doorverwijzen na korte vertraging
                setTimeout(() => {
                    window.location.href = 'mvpV3.html';
                }, 1000);
            } else {
                // Behandel foutresponse
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showMessage(data.message || 'Login mislukt. Probeer opnieuw.', 'error');
                } else {
                    const text = await response.text();
                    showMessage(text || 'Login mislukt. Controleer je inloggegevens.', 'error');
                }

                // Schakel verzendknop weer in
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Fout tijdens login:', error);
            showMessage('Er is een fout opgetreden tijdens het inloggen. Controleer je verbinding en probeer opnieuw.', 'error');

            // Schakel verzendknop weer in
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
