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

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form data
        const username = form.querySelector('input[name="username"]').value;
        const email = form.querySelector('input[name="email"]').value;
        const password = form.querySelector('input[name="password"]').value;
        const confirmPassword = form.querySelector('input[name="confirmPassword"]').value;
        const authorizedPerson = form.querySelector('input[name="authorizedPerson"]').value;
        const authorizedEmail = form.querySelector('input[name="authorizedEmail"]').value;
        const agreeCheckbox = document.getElementById('agree');

        // Validate passwords match
        if (password !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
            return;
        }

        // Validate terms agreement
        if (!agreeCheckbox.checked) {
            alert('Please agree to the Terms of Service and Privacy Policy.');
            return;
        }

        // Prepare data for API
        const formData = {
            username: username,
            email: email,
            password: password,
            authorizedPerson: authorizedPerson || null,
            authorizedEmail: authorizedEmail || null
        };

        try {
            // Submit to API
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Registration successful
                alert('Account created successfully! Redirecting to login...');
                window.location.href = 'mvpV3.html';
            } else {
                // Handle error response
                alert('Registration failed: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('An error occurred during registration. Please try again later.');
        }
    });
});
