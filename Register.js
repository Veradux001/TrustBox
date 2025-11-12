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