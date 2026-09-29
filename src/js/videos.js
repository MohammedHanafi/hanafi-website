(function ($) {
    "use strict";

    $("#videoModal").on("show.bs.modal", function (event) {
        var trigger = $(event.relatedTarget);
        var videoId = trigger.data("video-id");
        if (!videoId) { return; }
        $("#videoModalEmbed").html(
            '<iframe src="https://www.youtube.com/embed/' + videoId + '?autoplay=1" ' +
            'title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
            "allowfullscreen></iframe>"
        );
    });

    $("#videoModal").on("hidden.bs.modal", function () {
        $("#videoModalEmbed").empty(); // removing the iframe stops playback
    });
})(jQuery);
