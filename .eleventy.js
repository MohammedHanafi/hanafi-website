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

  // Same posts, grouped by category (each category's posts newest first, categories alphabetical)
  eleventyConfig.addCollection("postsByCategory", function (collectionApi) {
    const posts = collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date);
    const groups = {};
    posts.forEach(function (post) {
      const category = post.data.category || "Uncategorized";
      if (!groups[category]) groups[category] = [];
      groups[category].push(post);
    });
    return Object.keys(groups)
      .sort(function (a, b) { return a.localeCompare(b); })
      .map(function (category) { return { category: category, posts: groups[category] }; });
  });

  eleventyConfig.addFilter("readableDate", function (date) {
    return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  });

  eleventyConfig.addFilter("isoDate", function (date) {
    return new Date(date).toISOString();
  });

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
