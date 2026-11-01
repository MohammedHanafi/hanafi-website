const fs = require("fs");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Static assets copied as-is into the built site
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/lib");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/downloads");
  fs.mkdirSync(path.join("src", "downloads"), { recursive: true }); // uploaded lesson notes live here
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/favicon.ico");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");

  // Blog posts, newest first
  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
  });

  // Same posts, grouped by category. Categories follow the canonical order in
  // src/_data/categories.json (only categories that currently have posts are
  // shown); anything outside that list still works, just sorted alphabetically after.
  eleventyConfig.addCollection("postsByCategory", function (collectionApi) {
    const canonical = require("./src/_data/categories.json");
    const posts = collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
    const groups = {};
    posts.forEach(function (post) {
      const category = post.data.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(post);
    });
    const present = Object.keys(groups);
    const ordered = canonical.filter(function (c) { return present.includes(c); });
    const extra = present
      .filter(function (c) { return !canonical.includes(c); })
      .sort(function (a, b) { return a.localeCompare(b); });
    return ordered.concat(extra).map(function (category) { return { category: category, posts: groups[category] }; });
  });

  // Look up one category's posts out of the postsByCategory collection above,
  // used by the per-category pages (avoids Nunjucks for-loop scoping issues).
  eleventyConfig.addFilter("postsInCategory", function (groups, category) {
    const match = (groups || []).find(function (g) { return g.category === category; });
    return match ? match.posts : [];
  });

  // ---- Lesson notes: Term > Class > Subject > Week -------------------------------------
  // The terms, classes and the subjects of each level live in src/_data/curriculum.json.
  const curriculum = require("./src/_data/curriculum.json");
  const allClasses = [].concat.apply([], curriculum.levels.map(function (level) { return level.classes; }));
  const allSubjects = [];
  curriculum.levels.forEach(function (level) {
    level.subjects.forEach(function (subject) { if (!allSubjects.includes(subject)) allSubjects.push(subject); });
  });

  function slugifyText(str) {
    return (str || "").toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }
  // "basic 5 " -> "Basic 5" (the official spelling from the list), or "" if it is not in the list
  function canonical(list, value) {
    const wanted = String(value === undefined || value === null ? "" : value).trim().toLowerCase();
    return list.find(function (item) { return item.toLowerCase() === wanted; }) || "";
  }
  const warned = new Set();
  function warnOnce(message) {
    if (!warned.has(message)) { warned.add(message); console.warn(message); }
  }

  // A "file" is valid if it is a path on this site ("/downloads/x.pdf") or an https link.
  function localFilePath(p) {
    if (typeof p !== "string" || !p.startsWith("/") || p.startsWith("//") || p.includes("..")) return null;
    return p;
  }
  function fileKind(p) {
    if (typeof p === "string" && /^https:\/\//i.test(p)) return "external";
    return localFilePath(p) ? "local" : "";
  }
  eleventyConfig.addFilter("fileKind", fileKind);

  // "/downloads/week-1.pdf" -> "PDF"
  eleventyConfig.addFilter("fileExt", function (p) {
    const match = String(p || "").split(/[?#]/)[0].match(/\.([A-Za-z0-9]{1,5})$/);
    return match ? match[1].toUpperCase() : "";
  });

  // size of an uploaded file, e.g. "850 KB" or "2.3 MB" ("" if it is a link or cannot be found)
  eleventyConfig.addFilter("fileSize", function (p) {
    const local = localFilePath(p);
    if (!local) return "";
    let bytes;
    try {
      bytes = fs.statSync(path.join("src", decodeURIComponent(local))).size;
    } catch (err) {
      return "";
    }
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  });

  // Every usable note, in order: term, class, week, title. A note is left out (and the build log says
  // why) if it has no term/class/subject/week, or if its uploaded file cannot be found, rather than
  // showing a Download button that leads nowhere.
  function noteList(collectionApi) {
    const notes = [];
    collectionApi.getFilteredByGlob("src/notes/*.md").forEach(function (note) {
      const d = note.data;
      const label = "\"" + (d.title || "untitled") + "\"";
      const term = canonical(curriculum.terms, d.term);
      const schoolClass = canonical(allClasses, d.schoolClass);
      const subject = String(d.subject || "").trim();
      const week = parseInt(d.week, 10);
      if (!term || !schoolClass || !subject || !(week >= 1)) {
        warnOnce("Lesson note skipped (it needs a term, class, subject and week number): " + label);
        return;
      }
      const kind = fileKind(d.file);
      if (kind === "") {
        warnOnce("Lesson note skipped (no usable file): " + label);
        return;
      }
      if (kind === "local") {
        let found = false;
        try { found = fs.existsSync(path.join("src", decodeURIComponent(localFilePath(d.file)))); } catch (err) { found = false; }
        if (!found) {
          warnOnce("Lesson note skipped, its file was not found: " + label + " (" + d.file + ")");
          return;
        }
      }
      notes.push({
        date: note.date,
        data: Object.assign({}, d, { term: term, schoolClass: schoolClass, subject: canonical(allSubjects, subject) || subject, week: week })
      });
    });
    return notes.sort(function (a, b) {
      return (curriculum.terms.indexOf(a.data.term) - curriculum.terms.indexOf(b.data.term)) ||
        (allClasses.indexOf(a.data.schoolClass) - allClasses.indexOf(b.data.schoolClass)) ||
        (a.data.week - b.data.week) ||
        String(a.data.title).localeCompare(String(b.data.title));
    });
  }
  eleventyConfig.addCollection("notes", noteList);

  // One entry per Term + Class that has notes; each gets its own page (src/notes-section.njk).
  // Subjects follow the order in curriculum.json; weeks run 1, 2, 3...
  function buildSections(collectionApi) {
    const notes = noteList(collectionApi);
    const sections = [];
    curriculum.terms.forEach(function (term) {
      curriculum.levels.forEach(function (level) {
        level.classes.forEach(function (className) {
          const inClass = notes.filter(function (n) { return n.data.term === term && n.data.schoolClass === className; });
          if (!inClass.length) return;
          const present = [];
          inClass.forEach(function (n) { if (!present.includes(n.data.subject)) present.push(n.data.subject); });
          const usual = level.subjects.filter(function (s) { return present.includes(s); });
          const unusual = present.filter(function (s) { return !level.subjects.includes(s); }).sort();
          unusual.forEach(function (s) {
            warnOnce("Subject \"" + s + "\" is not in the usual list for " + className + " (shown anyway).");
          });
          sections.push({
            term: term,
            termSlug: slugifyText(term),
            className: className,
            classSlug: slugifyText(className),
            level: level.name,
            levelRange: level.range || "",
            url: "/lesson-notes/" + slugifyText(term) + "/" + slugifyText(className) + "/",
            count: inClass.length,
            subjects: usual.concat(unusual).map(function (subject) {
              return { subject: subject, notes: inClass.filter(function (n) { return n.data.subject === subject; }) };
            })
          });
        });
      });
    });
    return sections;
  }
  eleventyConfig.addCollection("noteSections", buildSections);

  // For the Lesson Notes front page: every term, with its levels and the classes that have notes
  eleventyConfig.addCollection("noteTerms", function (collectionApi) {
    const sections = buildSections(collectionApi);
    return curriculum.terms.map(function (term) {
      return {
        term: term,
        termSlug: slugifyText(term),
        levels: curriculum.levels.map(function (level) {
          return {
            name: level.name,
            range: level.range || "",
            classes: sections
              .filter(function (s) { return s.term === term && s.level === level.name; })
              .map(function (s) { return { className: s.className, url: s.url, count: s.count }; })
          };
        }).filter(function (level) { return level.classes.length > 0; })
      };
    });
  });

  // Other terms that have notes for the same class / other classes that have notes in the same term
  eleventyConfig.addFilter("sectionsForClass", function (sections, className) {
    return (sections || []).filter(function (s) { return s.className === className; });
  });
  eleventyConfig.addFilter("sectionsForTerm", function (sections, term) {
    return (sections || []).filter(function (s) { return s.term === term; });
  });

  // URL-safe version of a category name, e.g. "Education" -> "education"
  eleventyConfig.addFilter("slugify", function (str) {
    return (str || "").toString().toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  });

  eleventyConfig.addFilter("readableDate", function (date) {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  });

  eleventyConfig.addFilter("isoDate", function (date) {
    return new Date(date).toISOString();
  });

  // First N items of a list (used to show the latest few posts on the home page)
  eleventyConfig.addFilter("limit", function (list, count) {
    return (list || []).slice(0, count);
  });

  // Text -> JSON string that is safe to place inside a <script type="application/ld+json"> block
  eleventyConfig.addFilter("jsonSafe", function (value) {
    return JSON.stringify(value === undefined || value === null ? "" : value).replace(/</g, "\\u003c");
  });

  // srcset for an uploaded picture. scripts/optimize.py (run during the Netlify build) makes a
  // 800px copy and records real widths in src/_data/imageWidths.json. If that has not happened
  // (or the picture is small) this returns "" and the page just uses the single image.
  let imageWidths = null;
  function loadImageWidths() {
    if (imageWidths) return imageWidths;
    try {
      imageWidths = JSON.parse(fs.readFileSync(path.join("src", "_data", "imageWidths.json"), "utf8"));
    } catch (err) {
      imageWidths = {};
    }
    return imageWidths;
  }
  eleventyConfig.addFilter("imgSrcset", function (src) {
    if (!src || typeof src !== "string") return "";
    const match = src.match(/^(.*)\.(jpe?g|png)$/i);
    if (!match) return "";
    const width = loadImageWidths()[src];
    if (!width || width <= 800) return "";
    const small = match[1] + "-800." + match[2];
    if (!fs.existsSync(path.join("src", small))) return "";
    return small + " 800w, " + src + " " + width + "w";
  });

  // Turns a pasted YouTube URL (watch, youtu.be, shorts, or already-embed) into just the video ID
  eleventyConfig.addFilter("youtubeId", function (url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? match[1] : null;
  });

  // Latest videos from the YouTube channel (public RSS feed, no API key needed).
  // Runs at build time; if it fails for any reason (offline, feed down), the
  // Videos page just falls back to a plain link to the channel instead of breaking the build.
  eleventyConfig.addGlobalData("videos", async function () {
    const site = require("./src/_data/site.json");
    const channelId = site.youtubeChannelId;
    if (!channelId) return [];

    function decodeEntities(str) {
      return (str || "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
    }

    try {
      const response = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId);
      if (!response.ok) return [];
      const xml = await response.text();
      const entries = xml.split("<entry>").slice(1);

      return entries.map(function (chunk) {
        function tag(name) {
          const m = chunk.match(new RegExp("<" + name + ">([^<]*)</" + name + ">"));
          return m ? m[1] : "";
        }
        const id = tag("yt:videoId");
        const titleMatch = chunk.match(/<media:title>([\s\S]*?)<\/media:title>/);
        const thumbMatch = chunk.match(/<media:thumbnail url="([^"]+)"/);
        return {
          id: id,
          title: decodeEntities(titleMatch ? titleMatch[1] : tag("title")),
          published: tag("published"),
          thumbnail: thumbMatch ? thumbMatch[1] : (id ? "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" : "")
        };
      }).filter(function (v) { return v.id; }).slice(0, 12);
    } catch (e) {
      console.warn("Could not fetch YouTube videos at build time:", e.message);
      return [];
    }
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
