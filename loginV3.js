// ⭐ VEREISTE: Functie om berichten aan de gebruiker te tonen ⭐
function showMessage(message, type) {
    // Voor eenvoud, gebruiken we nu 'alert()'. 
    // In een echte app zou je dit in een HTML-element tonen.
    if (type === 'error') {
        alert("Fout: " + message);
    } else if (type === 'success') {
        alert("Succes: " + message);
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function myFunction() {
    var x = document.getElementById("myInput");
    if (x.type == "password") {
        x.type = "text";
    }

    else {
        x.type = "password";
    }
}

// loginV3.js (Pseudo-code)

// loginV3.js

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm'); // Selecteert het formulier via de ID
    const submitButton = form.querySelector('button[type="submit"]');

    // Voeg hier eventueel je showMessage functie toe als die nog niet bestaat
    // function showMessage(message, type) { /* ... logica ... */ }



    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault(); // 🛑 BLOKKEER de standaard browser submit

            // 1. Ophalen van de waarden
            const email = form.querySelector('input[name="email"]').value.trim();
            const password = form.querySelector('input[name="password"]').value;

            if (!email || !password) {
                showMessage('Voer e-mail en wachtwoord in.', 'error');
                return;
            }

            submitButton.disabled = true;
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Bezig met inloggen...';

            try {
                // 2. Asynchrone API call (fetch)
                const response = await fetch('/api/check', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email, password: password }),
                    credentials: 'same-origin'
                });

                if (response.ok) {
                    // 3. SUCCES: De server bevestigt de login
                    showMessage('✓ Succesvol ingelogd! Doorsturen...', 'success');

                    // Redirect naar de dashboardpagina
                    setTimeout(() => {
                        window.location.href = '/mvpV3.html';
                    }, 500);

                } else {
                    // 4. FOUT: De server (Node.js) stuurt een 401 of 500 terug
                    const errorText = await response.text();
                    showMessage('Login mislukt: ' + errorText, 'error');
                }

            } catch (error) {
                console.error('Netwerkfout:', error);
                showMessage('Er is een netwerkfout opgetreden. Probeer het opnieuw.', 'error');
            } finally {
                // Herstel de knopstatus in geval van een fout
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }
});