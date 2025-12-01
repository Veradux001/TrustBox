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
    // Vanaf hier weet je zeker dat #registerForm bestaat.
    // Koppel de event listener aan het formulier
    const form = document.getElementById('registerForm');

    // Als de browser de DOM-ready check doorloopt, KAN 'form' alleen null zijn als de ID fout is.
    // Om 100% zeker te zijn, kun je een check toevoegen (hoewel onnodig als de HTML klopt).
    if (!form) {
        console.error("Fout: Kon formulier met ID 'registerForm' niet vinden.");
        return;
    }

    // Luister naar de submit-actie van het formulier
    form.addEventListener('submit', async function (e) {
        e.preventDefault(); // Voorkomt dat de browser de standaard formulier-submit uitvoert

        // Haal alle waarden op
        const username = form.username.value.trim();
        const email = form.email.value.trim();
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;
        const authorizedPerson = form.authorizedPerson.value.trim(); // Optioneel
        const authorizedEmail = form.authorizedEmail.value.trim();   // Optioneel
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

        // 2. Data object voor de server
        const data = {
            username: username,
            email: email,
            password: password,
            // Stuur null als de optionele velden leeg zijn
            authorizedPerson: authorizedPerson || null,
            authorizedEmail: authorizedEmail || null
        };

        // 3. Stuur gegevens naar de Node.js server via fetch (als JSON)
        try {
            const serverUrl = 'https://sftpgo.diemitchell.com:3000/register';
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // De server stuurt bij succes of fouten een tekstuele response
            const resultText = await response.text();

            if (response.ok) { // Controleert op HTTP status 200-299
                alert(`Account succesvol aangemaakt voor ${data.username}!`);
                // Redirect naar de login pagina
                window.location.href = 'loginV3.html';

            } else {
                // Foutafhandeling: Probeer een duidelijke foutmelding te tonen
                let errorMessage = resultText;
                try {
                    // Probeer de fout als JSON te lezen, voor het geval de server JSON stuurt
                    const errorJson = JSON.parse(resultText);
                    errorMessage = errorJson.message || resultText;
                } catch (e) {
                    // Als de response geen geldige JSON is, gebruik dan de ruwe tekst van de server
                }
                alert(`Fout bij registratie: ${errorMessage}`);
            }

        } catch (error) {
            console.error('Netwerkfout bij registratie:', error);
            alert('Er is een netwerkfout opgetreden. Kan geen verbinding maken met de server. Controleer of de server draait en de CORS-instellingen correct zijn.');
        }
    });
});