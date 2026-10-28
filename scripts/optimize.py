#!/usr/bin/env python3
"""Build-time helpers for the Netlify build. It NEVER fails the build:
every problem is printed as a warning and the site is built without that step.

  python3 scripts/optimize.py images   (before the site is built)
      Shrinks uploaded pictures in src/img/uploads: nothing wider than 1600px, JPEG/PNG
      recompressed, plus an 800px copy (name-800.jpg) so phones download less. Writes the
      real widths to src/_data/imageWidths.json, which the templates read for srcset.

  python3 scripts/optimize.py minify   (after the site is built)
      Minifies the CSS files in _site/css.
"""
import json
import os
import re
import sys

UPLOADS = os.path.join("src", "img", "uploads")
MANIFEST = os.path.join("src", "_data", "imageWidths.json")
MAX_WIDTH = 1600
SMALL_WIDTH = 800
SKIP_BELOW_BYTES = 120 * 1024  # small pictures that are not too wide are left alone


def warn(message):
    print("[optimize] " + message)


def ensure_pillow():
    try:
        import PIL  # noqa: F401
        return True
    except Exception:
        pass
    try:
        import importlib
        import site
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "--quiet", "pillow"])
        importlib.invalidate_caches()
        site.addsitedir(site.getusersitepackages())
        import PIL  # noqa: F401
        return True
    except Exception as err:
        warn("Pillow is not available (%s); skipping picture optimization." % err)
        return False


def save_image(image, path, is_png):
    if is_png:
        image.save(path, format="PNG", optimize=True)
    else:
        image.convert("RGB").save(path, format="JPEG", quality=80, optimize=True, progressive=True)


def optimize_images():
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    widths = {}
    if os.path.isdir(UPLOADS) and ensure_pillow():
        from PIL import Image, ImageOps
        for folder, _dirs, files in os.walk(UPLOADS):
            for name in sorted(files):
                match = re.match(r"^(.*)\.(jpe?g|png)$", name, re.I)
                if not match or match.group(1).endswith("-800"):
                    continue
                path = os.path.join(folder, name)
                try:
                    is_png = match.group(2).lower() == "png"
                    original_bytes = os.path.getsize(path)
                    with Image.open(path) as opened:
                        image = ImageOps.exif_transpose(opened)
                        image.load()
                    width, height = image.size
                    final_width = width

                    if width > MAX_WIDTH or original_bytes > SKIP_BELOW_BYTES:
                        target = image
                        if width > MAX_WIDTH:
                            target = image.resize((MAX_WIDTH, round(height * MAX_WIDTH / width)), Image.LANCZOS)
                        temp = path + ".tmp"
                        save_image(target, temp, is_png)
                        if os.path.getsize(temp) < original_bytes or width > MAX_WIDTH:
                            os.replace(temp, path)
                            final_width = target.size[0]
                        else:
                            os.remove(temp)

                    if final_width > SMALL_WIDTH:
                        with Image.open(path) as current:
                            current.load()
                            small = current.resize((SMALL_WIDTH, round(current.size[1] * SMALL_WIDTH / current.size[0])), Image.LANCZOS)
                        small_path = os.path.join(folder, match.group(1) + "-800." + match.group(2))
                        save_image(small, small_path, is_png)

                    url = "/" + os.path.relpath(path, "src").replace(os.sep, "/")
                    widths[url] = final_width
                    warn("%s: %d KB -> %d KB" % (url, original_bytes // 1024, os.path.getsize(path) // 1024))
                except Exception as err:
                    warn("could not optimize %s (%s); leaving it as is." % (path, err))
    with open(MANIFEST, "w", encoding="utf-8") as handle:
        json.dump(widths, handle, indent=2)


def minify_css(css):
    """Strip comments and unneeded whitespace. Quoted strings, url(...) and licence comments are
    set aside first, so nothing inside them is ever changed."""
    saved = []

    def keep(piece):
        saved.append(piece)
        return "\x00%d\x00" % (len(saved) - 1)

    out = []
    i, n = 0, len(css)
    while i < n:
        ch = css[i]
        if css.startswith("/*", i):
            end = css.find("*/", i + 2)
            end = n if end == -1 else end + 2
            if css.startswith("/*!", i):
                out.append(keep(css[i:end]))
            i = end
        elif ch in "\"'":
            j = i + 1
            while j < n and css[j] != ch:
                j += 2 if css[j] == "\\" else 1
            out.append(keep(css[i:j + 1]))
            i = j + 1
        elif css.startswith("url(", i):
            j = css.find(")", i)
            j = n - 1 if j == -1 else j
            inner = css[i:j + 1]
            out.append(keep(inner if ('"' in inner or "'" in inner) else re.sub(r"\s+", "", inner)))
            i = j + 1
        elif ch.isspace():
            j = i
            while j < n and css[j].isspace():
                j += 1
            out.append(" ")
            i = j
        else:
            out.append(ch)
            i += 1
    text = "".join(out)
    # spaces that are always safe to drop; a space before ":" is kept because "a :hover" differs from "a:hover"
    text = re.sub(r" ?([{};,]) ?", r"\1", text)
    text = re.sub(r":\s+", ":", text)
    text = text.replace(";}", "}")
    text = re.sub(r"\x00(\d+)\x00", lambda m: saved[int(m.group(1))], text)
    return text.strip()


def minify_site_css():
    css_dir = os.path.join("_site", "css")
    if not os.path.isdir(css_dir):
        warn("_site/css not found; nothing to minify.")
        return
    for name in sorted(os.listdir(css_dir)):
        if not name.endswith(".css"):
            continue
        path = os.path.join(css_dir, name)
        try:
            with open(path, encoding="utf-8") as handle:
                before = handle.read()
            after = minify_css(before)
            if after and len(after) < len(before):
                with open(path, "w", encoding="utf-8") as handle:
                    handle.write(after)
                warn("%s: %d KB -> %d KB" % (name, len(before) // 1024, len(after) // 1024))
        except Exception as err:
            warn("could not minify %s (%s); leaving it as is." % (name, err))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        if mode == "images":
            optimize_images()
        elif mode == "minify":
            minify_site_css()
        else:
            warn("usage: optimize.py images|minify")
    except Exception as err:  # never break the build
        warn("unexpected problem (%s); continuing without it." % err)
    sys.exit(0)
