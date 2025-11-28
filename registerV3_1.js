function myFunction() {
    var x = document.getElementById("myInput");

    var y = document.getElementById("myInput2");

    if (x.type == "password") {
        x.type = "text";
    }

    else {
        x.type = "password";
    }

    if (y.type == "password") {
        y.type = "text";
    }

    else {
        y.type = "password";
    }
}

const form = document.getElementById('registerForm');

form.addEventListener('submit', async function (e) {
    e.preventDefault(); // voorkomt dat de pagina ververst

    const userName = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const agree = form.agree.checked;

    // 1. Alle velden ingevuld?
    if (!userName || !email || !password || !confirmPassword) {
        alert('Please fill in all fields.');
        return;
    }

    // 2. Wachtwoorden gelijk?
    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }

    // 3. Checkbox aangevinkt?
    if (!agree) {
        alert('You must agree to the Terms of Service and Privacy Policy.');
        return;
    }

    // 4. Als alles goed is (demo)
    alert('Account created for ' + userName + '! (demo only, not really saved)');
    // Voor demo: ga naar login pagina
    window.location.href = 'loginV3.html';

    // 3. Stuur gegevens naar de Node.js server via fetch (als JSON) /maak-account => register
    try {
        const response = await fetch('/register', { // Endpoint moet overeenkomen met server.js
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Belangrijk: Vertelt de server dat het JSON is
            },
            body: JSON.stringify(data) // Converteer JS object naar JSON string
        });

        // Verwerk de response van de server
        const result = await response.json();

        if (response.ok) { // Controleert of de HTTP status 200-299 is
            // Succes: Toon melding en voer de redirect uit
            alert(`Account succesvol aangemaakt voor ${data.username}!`);

            // ** DE REDIRECT NAAR loginV3.html **
            if (result.redirectUrl) {
                window.location.href = result.redirectUrl;
            } else {
                // Als de server geen URL stuurt (wat wel zou moeten), val terug op de standaard URL
                window.location.href = 'loginV3.html';
            }

        } else {
            // Fout: Toon de foutmelding die de server heeft teruggestuurd
            const errorMessage = result.message || 'Account aanmaken mislukt door een serverfout.';
            alert(`Fout bij registratie: ${errorMessage}`);
        }

    } catch (error) {
        console.error('Netwerkfout bij registratie:', error);
        alert('Er is een netwerkfout opgetreden. Kan geen verbinding maken met de server.');
    }




});

