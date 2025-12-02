// VEREISTE: Functie om berichten aan de gebruiker te tonen.
// Deze zoekt naar een element met de ID 'message-area' in de HTML.
function showMessage(message, type) {
    const messageArea = document.getElementById('message-area');

    // Creëer een tijdelijke boodschap als de container ontbreekt (fallback)
    if (!messageArea) {
        console.error("Fout: HTML element met ID 'message-area' ontbreekt.", message);
        // Gebruik een alert als noodoplossing om de gebruiker te informeren
        alert(`[${type.toUpperCase()}] ${message}`);
        return;
    }

    // Wis eerdere berichten
    messageArea.innerHTML = '';
    messageArea.className = 'message-box'; // Reset styling

    const p = document.createElement('p');
    p.textContent = message;

    // Pas de kleur aan op basis van het type bericht
    if (type === 'error') {
        messageArea.classList.add('error');
    } else if (type === 'success') {
        messageArea.classList.add('success');
    }

    messageArea.appendChild(p);
    messageArea.style.display = 'block'; // Toon de box
}


// Functie om het wachtwoord te tonen/verbergen (gebruikt door de checkbox in de HTML)
function myFunction() {
    var x = document.getElementById("myInput");
    var eyeIcon = document.querySelector('.input-box .fa-eye, .input-box .fa-eye-slash');

    if (x.type === "password") {
        x.type = "text";
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        }
    } else {
        x.type = "password";
        if (eyeIcon) {
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
}

// =========================================================
// Login Verwerkings Logica
// =========================================================

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');

    // Zorg ervoor dat het formulier bestaat voordat we event listeners toevoegen
    if (!form) {
        console.error("Fout: Het formulier met ID 'loginForm' is niet gevonden.");
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // 🛑 BLOKKEER de standaard browser submit

        // Verberg eerst alle oude berichten
        const messageArea = document.getElementById('message-area');
        if (messageArea) {
            messageArea.style.display = 'none';
        }

        // 1. Ophalen van de waarden
        const emailInput = form.querySelector('input[name="email"]');
        const passwordInput = form.querySelector('input[name="password"]');

        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
            showMessage('Voer zowel uw e-mailadres als wachtwoord in.', 'error');
            return;
        }

        // Knop deactiveren en tekst wijzigen
        if (submitButton) {
            submitButton.disabled = true;
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Bezig met inloggen...';
        }


        try {
            // 2. Asynchrone API call (fetch) naar de Express server
            const response = await fetch('/api/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password }),
                credentials: 'same-origin'
            });

            if (response.ok) {
                // 3. SUCCES: De server bevestigt de login (Status 200)
                showMessage('✓ Succesvol ingelogd! U wordt doorgestuurd...', 'success');

                // Redirect naar de dashboardpagina
                setTimeout(() => {
                    window.location.href = '/mvpV3.html';
                }, 1000);

            } else {
                // 4. FOUT: De server stuurt een 400, 401, 500 etc. terug
                const errorText = await response.text();

                // Toon de foutboodschap die door de server is verstrekt
                showMessage('Login mislukt: ' + errorText, 'error');
            }

        } catch (error) {
            console.error('Netwerkfout:', error);
            // Dit vangt echte netwerkfouten op (bijv. server niet bereikbaar)
            showMessage('Er is een netwerkfout opgetreden. Controleer uw verbinding en probeer het opnieuw.', 'error');
        } finally {
            // Herstel de knopstatus, tenzij er succesvol is ingelogd en we aan het redirecten zijn
            if (submitButton && !response?.ok) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    });
});