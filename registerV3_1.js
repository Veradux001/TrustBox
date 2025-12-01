function myFunction() {
    var x = document.getElementById("myInput");
    var y = document.getElementById("myInput2");

    // Toggle logica is hier correct: als het wachtwoord is, maak het tekst, anders wachtwoord.
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

const form = document.getElementById('registerForm');

form.addEventListener('submit', async function (e) {
    e.preventDefault(); // Voorkomt dat de browser de standaard formulier-submit uitvoert

    // Haal alle waarden op
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const authorizedPerson = form.authorizedPerson.value.trim(); // Nieuw: optionele velden
    const authorizedEmail = form.authorizedEmail.value.trim();   // Nieuw: optionele velden
    const agree = form.agree.checked;

    // 1. Validatie (lokale controles)
    if (!username || !email || !password || !confirmPassword) {
        alert('Please fill in all required fields (Username, Email, Password, Confirm Password).');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    if (!agree) {
        alert('You must agree to the Terms of Service and Privacy Policy.');
        return;
    }

    // 2. ✅ OPLOSSING 2: DEFINIEER DE 'data' VARIABELE met alle velden
    const data = {
        username: username,
        email: email,
        password: password, // Stuur het pure wachtwoord naar de server voor hashing
        authorizedPerson: authorizedPerson || null, // Stuur null als het leeg is
        authorizedEmail: authorizedEmail || null
    };

    // 3. Stuur gegevens naar de Node.js server via fetch (als JSON)
    try {
        // ✅ OPLOSSING 3: GEBRUIK HET VOLLEDIGE ABSOLUTE ENDPOINT
        const response = await fetch('https://sftpgo.diemitchell.com:3000/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        // Verwerk de response van de server
        // De server stuurt nu text terug bij succes, geen JSON
        const resultText = await response.text();

        if (response.ok) { // Controleert of de HTTP status 200-299 is
            alert(`Account succesvol aangemaakt voor ${data.username}!`);

            // Redirect naar de login pagina
            window.location.href = 'loginV3.html';

        } else {
            // Fout: Probeer de fout als JSON te lezen, anders gebruik je de tekst
            let errorMessage = resultText;
            try {
                const errorJson = JSON.parse(resultText);
                errorMessage = errorJson.message || resultText;
            } catch (e) {
                // Als de response geen geldige JSON is, gebruik dan de ruwe tekst
            }
            alert(`Fout bij registratie: ${errorMessage}`);
        }

    } catch (error) {
        console.error('Netwerkfout bij registratie:', error);
        alert('Er is een netwerkfout opgetreden. Kan geen verbinding maken met de server. Controleer of de server draait en de CORS-instellingen correct zijn.');
    }
});