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
