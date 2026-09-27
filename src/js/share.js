(function () {
    "use strict";

    var url = encodeURIComponent(window.location.href);
    var title = encodeURIComponent(document.title);

    var targets = {
        twitter: "https://twitter.com/intent/tweet?url=" + url + "&text=" + title,
        facebook: "https://www.facebook.com/sharer/sharer.php?u=" + url,
        linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=" + url,
        whatsapp: "https://wa.me/?text=" + title + "%20" + url
    };

    Array.prototype.forEach.call(document.querySelectorAll("[data-share]"), function (el) {
        var network = el.getAttribute("data-share");

        if (network === "copy") {
            el.addEventListener("click", function () {
                var label = el.querySelector(".copy-label");
                var restore = label ? label.textContent : null;

                function showResult(text) {
                    if (label) {
                        label.textContent = text;
                        setTimeout(function () { label.textContent = restore; }, 2000);
                    }
                }

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(window.location.href)
                        .then(function () { showResult("Copied!"); })
                        .catch(function () { showResult("Couldn't copy"); });
                } else {
                    // Fallback for browsers without the Clipboard API
                    var temp = document.createElement("input");
                    temp.value = window.location.href;
                    document.body.appendChild(temp);
                    temp.select();
                    try {
                        document.execCommand("copy");
                        showResult("Copied!");
                    } catch (e) {
                        showResult("Couldn't copy");
                    }
                    document.body.removeChild(temp);
                }
            });
            return;
        }

        if (targets[network]) {
            el.setAttribute("href", targets[network]);
            el.setAttribute("target", "_blank");
            el.setAttribute("rel", "noopener");
        }
    });
})();
