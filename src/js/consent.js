(function () {
    "use strict";

    var KEY = "analytics_consent"; // "granted" or "denied"
    var gaId = (document.documentElement.getAttribute("data-ga-id") || "").trim();
    var banner = document.getElementById("consent-banner");

    function readChoice() {
        try { return window.localStorage.getItem(KEY); } catch (err) { return null; }
    }

    function saveChoice(value) {
        try { window.localStorage.setItem(KEY, value); } catch (err) { /* private mode: choice lasts for this page only */ }
    }

    function loadAnalytics() {
        if (!gaId || window.__gaLoaded) { return; }
        window.__gaLoaded = true;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag("js", new Date());
        window.gtag("config", gaId);
        var script = document.createElement("script");
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(gaId);
        document.head.appendChild(script);
    }

    // Remove Google Analytics cookies if someone declines after previously accepting
    function clearAnalyticsCookies() {
        var host = window.location.hostname;
        var parts = host.split(".");
        var domains = ["", host, "." + host];
        if (parts.length > 2) { domains.push("." + parts.slice(-2).join(".")); }
        document.cookie.split(";").forEach(function (entry) {
            var name = entry.split("=")[0].trim();
            if (name === "_ga" || name === "_gid" || name.indexOf("_ga_") === 0) {
                domains.forEach(function (domain) {
                    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" +
                        (domain ? "; domain=" + domain : "");
                });
            }
        });
    }

    function setBannerVisible(visible) {
        if (!banner) { return; }
        if (visible) { banner.removeAttribute("hidden"); } else { banner.setAttribute("hidden", ""); }
    }

    function choose(value) {
        saveChoice(value);
        setBannerVisible(false);
        if (value === "granted") {
            loadAnalytics();
        } else {
            clearAnalyticsCookies();
        }
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-consent]"), function (button) {
        button.addEventListener("click", function () {
            choose(button.getAttribute("data-consent") === "accept" ? "granted" : "denied");
        });
    });

    // "Cookie settings" link in the footer re-opens the banner
    Array.prototype.forEach.call(document.querySelectorAll("[data-consent-open]"), function (button) {
        button.addEventListener("click", function () {
            setBannerVisible(true);
            var first = banner && banner.querySelector("button");
            if (first) { first.focus(); }
        });
    });

    var choice = readChoice();
    if (choice === "granted") {
        loadAnalytics();
    } else if (choice !== "denied") {
        setBannerVisible(true);
    }
})();
