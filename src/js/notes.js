(function () {
    "use strict";

    var input = document.getElementById("notesSearch");
    if (!input) { return; }

    var items = Array.prototype.slice.call(document.querySelectorAll(".note-item"));
    var groups = Array.prototype.slice.call(document.querySelectorAll(".note-group"));
    var empty = document.getElementById("notesNoResults");
    var count = document.getElementById("notesCount");

    function apply() {
        var terms = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        var shown = 0;

        items.forEach(function (item) {
            var text = (item.getAttribute("data-search") || "").toLowerCase();
            var match = terms.every(function (term) { return text.indexOf(term) !== -1; });
            if (match) { item.removeAttribute("hidden"); shown += 1; } else { item.setAttribute("hidden", ""); }
        });

        groups.forEach(function (group) {
            if (group.querySelector(".note-item:not([hidden])")) { group.removeAttribute("hidden"); } else { group.setAttribute("hidden", ""); }
        });

        if (empty) {
            if (shown === 0) { empty.removeAttribute("hidden"); } else { empty.setAttribute("hidden", ""); }
        }
        if (count) {
            count.textContent = terms.length ? shown + (shown === 1 ? " note found" : " notes found") : "";
        }
    }

    input.addEventListener("input", apply);
})();
