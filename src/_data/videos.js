const https = require("https");
const site = require("./site.json");

function fetchText(url, redirectsLeft) {
  redirectsLeft = redirectsLeft === undefined ? 3 : redirectsLeft;
  return new Promise(function (resolve, reject) {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        return fetchText(res.headers.location, redirectsLeft - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error("HTTP " + res.statusCode + " fetching " + url));
      }
      var data = "";
      res.setEncoding("utf8");
      res.on("data", function (chunk) { data += chunk; });
      res.on("end", function () { resolve(data); });
    }).on("error", reject);
  });
}

function decodeEntities(str) {
  return (str || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

// Parses YouTube's public "uploads" RSS/Atom feed with simple string matching
// rather than a full XML parser, since the feed's shape is small and stable.
function parseFeed(xml) {
  return xml.split("<entry>").slice(1).map(function (chunk) {
    var idMatch = chunk.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    if (!idMatch) return null;
    var id = idMatch[1];
    var titleMatch = chunk.match(/<title>([\s\S]*?)<\/title>/);
    var publishedMatch = chunk.match(/<published>(.*?)<\/published>/);
    return {
      id: id,
      title: decodeEntities(titleMatch ? titleMatch[1] : "Video"),
      published: publishedMatch ? publishedMatch[1] : null,
      thumbnail: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
      url: "https://www.youtube.com/watch?v=" + id
    };
  }).filter(Boolean);
}

module.exports = async function () {
  if (!site.youtubeChannelId) return [];
  try {
    var xml = await fetchText("https://www.youtube.com/feeds/videos.xml?channel_id=" + site.youtubeChannelId);
    var videos = parseFeed(xml);
    videos.sort(function (a, b) { return new Date(b.published) - new Date(a.published); });
    return videos.slice(0, 24);
  } catch (err) {
    // Never fail the whole site build over YouTube being briefly unreachable;
    // the Videos page shows a friendly empty state in that case instead.
    console.warn("Could not fetch YouTube videos at build time:", err.message);
    return [];
  }
};
