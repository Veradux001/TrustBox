function validatePassword() {
    // Haal de waarden op via de ID's
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const errorBox = document.getElementById('error-message');

    // Controleer of de twee waarden niet overeenkomen
    if (password !== confirmPassword) {
        // Toon de foutmelding in de rode box
        errorBox.textContent = "Fout: De ingevoerde wachtwoorden komen NIET overeen.";
        errorBox.style.display = 'block';
        return false; // Dit stopt het versturen van het formulier
    }

    // Als de wachtwoorden overeenkomen, verberg dan de foutmelding
    errorBox.style.display = 'none';
    errorBox.textContent = '';

    //simulateSuccessfulSubmission();
    //return false; // Voorkomt POST in deze preview
    return true; // Dit staat toe dat het formulier naar de server wordt gestuurd
}

// Functie om succes te simuleren in deze preview
//function simulateSuccessfulSubmission() {
//    const messageBox = document.getElementById('success-message');
//    messageBox.innerHTML = '<h1>Validatie Succesvol!</h1><p>De wachtwoorden komen overeen. In een echte applicatie zou dit de database-insert triggeren.</p>';
//    messageBox.style.display = 'block';
//}