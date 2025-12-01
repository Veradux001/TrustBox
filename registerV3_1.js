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

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const username = form.querySelector('input[name="username"]').value;
        const email = form.querySelector('input[name="email"]').value;
        const password = form.querySelector('input[name="password"]').value;
        const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;
        const agreeCheckbox = document.getElementById('agree');

        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return false;
        }

        // Validate terms agreement
        if (!agreeCheckbox.checked) {
            alert('Please agree to the Terms of Service and Privacy Policy');
            return false;
        }

        // In a real application, you would send the data to a backend server here
        // For now, we'll just navigate to the MVP page
        window.location.href = 'mvpV3.html';

        return false;
    });
});
