module.exports = function (eleventyConfig) {
  // Static assets copied as-is into the built site
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/lib");
  eleventyConfig.addPassthroughCopy("src/img");
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
