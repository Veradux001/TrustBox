// Functie voor het tonen/verbergen van het wachtwoord (wordt aangeroepen vanuit de HTML onclick)
function myFunction() {
    var x = document.getElementById("myInput");
    var y = document.getElementById("myInput2");

    // Toggle logica: als het type "password" is, maak het dan "text", anders "password".
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }

    if (y.type === "password") {
        y.type = "text";
    } else {
        y.type = "password";
    }
}

// Zorg ervoor dat de code pas wordt uitgevoerd nadat de HTML-structuur is geladen.
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');

    if (!form) {
        console.error("Fout: Kon formulier met ID 'registerForm' niet vinden.");
        return;
    }

    // Selecteer de knop om de status te kunnen wijzigen
    const submitButton = form.querySelector('button[type="submit"]');

    // Luister naar de submit-actie van het formulier
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // Voorkomt dat de browser de standaard formulier-submit uitvoert

        // Haal alle waarden op
        const username = form.username.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const authorizedPerson = form.authorizedPerson.value.trim();
        const authorizedEmail = form.authorizedEmail.value.trim();
        const agree = form.agree.checked;

        // 1. Client-side Validatie
        if (!username || !email || !password || !confirmPassword) {
            alert('Vul a.u.b. alle verplichte velden in (Gebruikersnaam, E-mail, Wachtwoord, Herhaal Wachtwoord).');
            return;
        }

        if (password !== confirmPassword) {
            alert('Wachtwoorden komen niet overeen.');
            return;
        }

        if (!agree) {
            alert('U moet akkoord gaan met de Algemene Voorwaarden en Privacybeleid.');
            return;
        }

        // --- START LAADSTATUS (Visuele feedback voor de gebruiker) ---
        submitButton.disabled = true;
        submitButton.textContent = 'Bezig met aanmaken...';
        // --- EINDE LAADSTATUS ---

        // 2. Data object voor de server (niet gebruikt in de simulatie, maar goed om te behouden)
        const data = {
            username: username,
            email: email,
            password: password,
            // Stuur null als de optionele velden leeg zijn
            authorizedPerson: authorizedPerson || null,
            authorizedEmail: authorizedEmail || null
        };

        // 3. SIMULATIE: Vervangt de fetch() call die faalde op de demo-server
        try {
            // Simuleer een serververtraging van 1 seconde voor realistische UX
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Aangezien de externe server de registratie blokkeerde, 
            // simuleren we een succes om de client-side flow (redirect) te testen.
            const success = true;

            if (success) {
                // Gebruik een simulatie-alert om duidelijk te maken dat dit niet de echte registratie is
                alert(`[SIMULATIE] Account succesvol aangemaakt voor ${data.username}! U wordt doorgestuurd naar de loginpagina.`);

                // Redirect naar de login pagina
                window.location.href = 'loginV3.html';
            }

        } catch (error) {
            // Dit blok vangt interne JavaScript-fouten op
            console.error('Interne fout tijdens registratieverwerking:', error);
            alert('Er is een interne fout opgetreden.');
        } finally {
            // --- EINDE LAADSTATUS (WORDT ALTIJD UITGEVOERD) ---
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            // --- EINDE LAADSTATUS ---
        }
    });
});