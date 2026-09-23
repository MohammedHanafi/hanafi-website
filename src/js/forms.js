(function () {
    "use strict";

    // Where the forms are sent.
    //  - Netlify: leave as "/" (Netlify Forms collects the submissions automatically).
    //  - Formspree or similar: use your endpoint, e.g. "https://formspree.io/f/YOUR_FORM_ID".
    var FORM_ENDPOINT = "/";
    var FALLBACK_EMAIL = "hanafim58@gmail.com";

    function showFeedback(form, type, text, offerEmail) {
        var box = form.querySelector(".form-feedback");
        if (!box) { return; }
        box.textContent = "";

        var alertBox = document.createElement("div");
        alertBox.className = "alert alert-" + type + " mb-0";
        alertBox.setAttribute("role", type === "danger" ? "alert" : "status");
        alertBox.appendChild(document.createTextNode(text));

        if (offerEmail) {
            alertBox.appendChild(document.createTextNode(" You can also email me at "));
            var link = document.createElement("a");
            link.className = "alert-link";
            link.href = "mailto:" + FALLBACK_EMAIL;
            link.textContent = FALLBACK_EMAIL;
            alertBox.appendChild(link);
            alertBox.appendChild(document.createTextNode("."));
        }
        box.appendChild(alertBox);
    }

    function handleSubmit(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var button = form.querySelector("[type=submit]");

        if (!form.checkValidity()) {
            form.classList.add("was-validated");
            var firstInvalid = form.querySelector(":invalid");
            if (firstInvalid) { firstInvalid.focus(); }
            var invalidMessage = form.getAttribute("data-invalid-message");
            if (invalidMessage) { showFeedback(form, "danger", invalidMessage, false); }
            return;
        }

        button.disabled = true;

        fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            },
            body: new URLSearchParams(new FormData(form)).toString()
        })
            .then(function (response) {
                if (!response.ok) { throw new Error("HTTP " + response.status); }
                form.reset();
                form.classList.remove("was-validated");
                showFeedback(form, "success", form.getAttribute("data-success-message") || "Thank you. Your message has been sent.", false);
            })
            .catch(function () {
                showFeedback(form, "danger", "Your message could not be sent right now. Please try again in a few minutes.", true);
            })
            .then(function () {
                setTimeout(function () { button.disabled = false; }, 1000);
            });
    }

    Array.prototype.forEach.call(document.querySelectorAll("form.js-form"), function (form) {
        form.addEventListener("submit", handleSubmit);
    });
})();
