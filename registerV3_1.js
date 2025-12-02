// Schakel wachtwoord zichtbaarheid voor individuele velden
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const messageContainer = document.getElementById('messageContainer');
    const form = document.getElementById('registerForm');
    const submitButton = form.querySelector('button[type="submit"]');

    // Schakel wachtwoordveld zichtbaarheid
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Schakel bevestig wachtwoordveld zichtbaarheid
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            confirmPasswordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Wachtwoordsterkte checker
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
                    passwordStrength.textContent = '⚠️ Zwak wachtwoord: ' + strength.message;
                    passwordStrength.style.color = '#e74c3c';
                    break;
                case 'medium':
                    passwordStrength.textContent = '⚡ Gemiddeld wachtwoord: ' + strength.message;
                    passwordStrength.style.color = '#f39c12';
                    break;
                case 'strong':
                    passwordStrength.textContent = '✓ Sterk wachtwoord';
                    passwordStrength.style.color = '#27ae60';
                    break;
            }
        });
    }

    // Invoer sanitisatie helper - beschermt tegen XSS
    function sanitizeInput(input) {
        if (!input) return '';

        // Maak een tijdelijk element om gebruik te maken van browser's HTML encoding
        const temp = document.createElement('div');
        temp.textContent = input.trim();
        return temp.innerHTML;
    }

    // E-mail validatie helper - robuustere regex
    function isValidEmail(email) {
        // RFC 5322 compatibele e-mailvalidatie (vereenvoudigd maar robuust)
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254; // RFC 5321 maximale lengte
    }

    // Wachtwoordsterkte validatie
    function checkPasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return { level: 'weak', message: 'Minimaal 8 karakters vereist' };
        }

        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

        if (strength < 2) {
            return { level: 'weak', message: 'Voeg hoofdletters, cijfers of speciale tekens toe' };
        } else if (strength < 4) {
            return { level: 'medium', message: 'Voeg meer variatie toe voor betere beveiliging' };
        } else {
            return { level: 'strong', message: '' };
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
        } else if (type === 'warning') {
            messageContainer.style.backgroundColor = '#ffeaa7';
            messageContainer.style.color = '#d63031';
            messageContainer.style.border = '1px solid #fdcb6e';
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

        // Controleer op veilige verbinding (FORCEER, niet alleen waarschuwen)
        if (!isSecureConnection()) {
            showMessage('🔒 Fout: Dit formulier moet via HTTPS worden verzonden voor beveiliging. Gebruik https://', 'error');
            return; // Blokkeer inzending via HTTP
        }

        // Haal formulierelementen op met null checks
        const usernameInput = form.querySelector('input[name="username"]');
        const emailInput = form.querySelector('input[name="email"]');
        const passwordInput = form.querySelector('input[name="password"]');
        const confirmPasswordInput = form.querySelector('input[name="confirmPassword"]');
        const authorizedPersonInput = form.querySelector('input[name="authorizedPerson"]');
        const authorizedEmailInput = form.querySelector('input[name="authorizedEmail"]');
        const agreeCheckbox = document.getElementById('agree');

        // Valideer dat alle vereiste elementen bestaan
        if (!usernameInput || !emailInput || !passwordInput || !confirmPasswordInput || !agreeCheckbox) {
            showMessage('Fout: Formulierelementen ontbreken. Ververs de pagina en probeer opnieuw.', 'error');
            return;
        }

        // Haal en sanitiseer formulierdata op
        const username = sanitizeInput(usernameInput.value);
        const email = sanitizeInput(emailInput.value);
        const password = passwordInput.value; // Sanitiseer wachtwoord niet - sta alle karakters toe
        const confirmPassword = confirmPasswordInput.value;
        const authorizedPerson = authorizedPersonInput ? sanitizeInput(authorizedPersonInput.value) : '';
        const authorizedEmail = authorizedEmailInput ? sanitizeInput(authorizedEmailInput.value) : '';

        // Valideer gebruikersnaam
        if (username.length < 3) {
            showMessage('Gebruikersnaam moet minimaal 3 karakters lang zijn.', 'error');
            return;
        }

        if (username.length > 30) {
            showMessage('Gebruikersnaam mag maximaal 30 karakters lang zijn.', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            showMessage('Gebruikersnaam mag alleen letters, cijfers, underscores en koppeltekens bevatten.', 'error');
            return;
        }

        // Valideer e-mail
        if (!isValidEmail(email)) {
            showMessage('Voer een geldig e-mailadres in.', 'error');
            return;
        }

        // Valideer wachtwoordsterkte - vereist minimaal sterke wachtwoorden
        const passwordCheck = checkPasswordStrength(password);
        if (passwordCheck.level === 'weak' || passwordCheck.level === 'medium') {
            showMessage('Wachtwoord moet sterk zijn. Gebruik minimaal 8 karakters met hoofdletters, kleine letters, cijfers en speciale tekens.', 'error');
            return;
        }

        // Valideer dat wachtwoorden overeenkomen
        if (password !== confirmPassword) {
            showMessage('Wachtwoorden komen niet overeen. Probeer opnieuw.', 'error');
            return;
        }

        // Valideer gemachtigde e-mail als gemachtigde persoon is opgegeven
        if (authorizedPerson && !authorizedEmail) {
            showMessage('Geef een e-mailadres op voor de gemachtigde persoon.', 'error');
            return;
        }

        if (authorizedEmail && !isValidEmail(authorizedEmail)) {
            showMessage('Voer een geldig e-mailadres in voor de gemachtigde.', 'error');
            return;
        }

        // Valideer akkoord met voorwaarden
        if (!agreeCheckbox.checked) {
            showMessage('Ga akkoord met de Algemene Voorwaarden en het Privacybeleid.', 'error');
            return;
        }

        // Bereid data voor API voor
        const formData = {
            username: username,
            email: email,
            password: password,
            authorizedPerson: authorizedPerson || null,
            authorizedEmail: authorizedEmail || null
        };

        // Schakel verzendknop uit en toon laadstatus
        submitButton.disabled = true;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Account aanmaken...';

        try {
            // Haal CSRF token op indien beschikbaar (uit meta tag)
            const csrfToken = document.querySelector('meta[name="csrf-token"]');
            const headers = {
                'Content-Type': 'application/json'
            };

            // Voeg CSRF token toe aan headers indien beschikbaar
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken.getAttribute('content');
            }

            // Verstuur naar API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(formData),
                credentials: 'same-origin' // Inclusief cookies voor sessie-gebaseerde CSRF
            });

            // Behandel response
            if (response.ok) {
                // Controleer of response JSON is voordat parseren
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showMessage('✓ Account succesvol aangemaakt! Doorverwijzen naar login...', 'success');
                } else {
                    // Behandel platte tekst succesresponse (voor achterwaartse compatibiliteit)
                    const text = await response.text();
                    showMessage('✓ Account succesvol aangemaakt! Doorverwijzen naar login...', 'success');
                }

                // Doorverwijzen na korte vertraging om gebruiker de melding te laten zien
                setTimeout(() => {
                    window.location.href = 'loginV3.html';
                }, 1500);
            } else {
                // Controleer of response JSON is
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    showMessage('Registratie mislukt: ' + (data.message || 'Onbekende fout'), 'error');
                } else {
                    // Niet-JSON foutresponse
                    const text = await response.text();
                    showMessage('Registratie mislukt: ' + (text || 'Serverfout (status ' + response.status + ')'), 'error');
                }

                // Schakel verzendknop weer in
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        } catch (error) {
            console.error('Fout tijdens registratie:', error);
            showMessage('Er is een fout opgetreden tijdens registratie. Controleer je verbinding en probeer opnieuw.', 'error');

            // Schakel verzendknop weer in
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
});
