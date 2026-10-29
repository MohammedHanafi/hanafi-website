(function () {
    "use strict";

    var lightbox = document.getElementById("videoLightbox");
    if (!lightbox) { return; }
    var frame = document.getElementById("videoLightboxFrame");
    var closeButton = lightbox.querySelector(".video-lightbox-close");
    var lastTile = null;

    function open(videoId, tile) {
        if (!/^[\w-]{11}$/.test(videoId || "")) { return; } // only real YouTube IDs
        lastTile = tile;
        frame.innerHTML =
            '<iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1" ' +
            'title="Video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            "allowfullscreen></iframe>";
        lightbox.removeAttribute("hidden");
        document.body.classList.add("lightbox-open");
        closeButton.focus();
    }

    function close() {
        frame.innerHTML = ""; // removing the player stops the video
        lightbox.setAttribute("hidden", "");
        document.body.classList.remove("lightbox-open");
        if (lastTile) { lastTile.focus(); }
    }

    Array.prototype.forEach.call(document.querySelectorAll(".video-tile[data-video-id]"), function (tile) {
        tile.addEventListener("click", function () { open(tile.getAttribute("data-video-id"), tile); });
    });

    closeButton.addEventListener("click", close);

    // clicking the dark area around the video closes it
    lightbox.addEventListener("click", function (event) {
        if (event.target === lightbox) { close(); }
    });

    document.addEventListener("keydown", function (event) {
        if (lightbox.hasAttribute("hidden")) { return; }
        if (event.key === "Escape") {
            close();
        } else if (event.key === "Tab") {
            event.preventDefault(); // keep keyboard focus on the close button while the player is open
            closeButton.focus();
        }
    });
})();
