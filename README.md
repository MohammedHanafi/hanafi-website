# Mohammed Hanafi — personal site

A static site built with [Eleventy](https://www.11ty.dev/), with a "publish" screen at `/admin` powered by [Decap CMS](https://decapcms.org/) so new blog posts don't need any code editing.

## How it's organized

```
src/
  _includes/base.njk   the shared page shell (sidebar, nav, footer)
  _includes/post.njk   the layout each blog post uses
  posts/*.md           one Markdown file per blog post — this is what /admin edits
  index.njk, about.njk, blog.njk, contact.njk, 404.njk
  css/, js/, img/, lib/
  admin/                the Decap CMS editor (config.yml + index.html)
```

The blog list and the home page's featured article are generated from whatever files exist in `src/posts/` — adding a post there (by hand or through `/admin`) is enough; you never touch `blog.html` or create a new page file.

## 1. Test it locally (optional, needs Node.js)

```
npm install
npm run start
```

This serves the site at `http://localhost:8080` and rebuilds on save. `npm run build` builds the production files into `_site/`.

## 2. Put the code on GitHub

Decap CMS needs a Git repository to commit new posts to.

1. Create a new repository on GitHub (or GitLab).
2. Push this folder to it:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

## 3. Deploy on Netlify

1. Sign in at [app.netlify.com](https://app.netlify.com) and choose **Add new site → Import an existing project**.
2. Pick the repository. Netlify reads `netlify.toml` automatically, so the build command (`npm run build`) and publish folder (`_site`) are already set.
3. Deploy. You'll get a URL like `yoursite.netlify.app`; you can add your own domain later in **Site configuration → Domain management**.

## 4. Turn on the admin panel (Netlify Identity + Git Gateway)

This is what lets you log in at `/admin` and publish without touching code.

1. In the Netlify site dashboard: **Integrations → Identity → Enable Identity** (in older dashboards: **Site configuration → Identity**).
2. Under Identity settings, set **Registration** to **Invite only** (so strangers can't sign up).
3. Enable **Git Gateway** (under Identity → Services). This is what lets the browser-based CMS commit files to your repo without you handing out a GitHub token.
4. Go to the **Identity** tab and **Invite a user** — invite your own email address. You'll get an email to set a password.
5. Visit `https://yoursite.netlify.app/admin/`, log in, and you'll see a "Blog posts" collection with a **New post** button.

From then on: write a post in the CMS → click **Publish** → it commits a Markdown file to `src/posts/` in your GitHub repo → Netlify rebuilds the site automatically → the post appears on `/blog.html` and the home page.

## 5. Forms (contact + newsletter)

Both forms already have `data-netlify="true"`, which is Netlify's own zero-backend form handling — no PHP, no database. Once the site is deployed on Netlify, submissions show up under **Forms** in your site dashboard, and you can turn on an email notification there so you get pinged per submission. No extra setup needed.

## 6. Adding a domain

Buy a domain from any registrar (Namecheap, Cloudflare, etc.), then in Netlify go to **Domain management → Add a domain** and follow the DNS instructions it gives you. HTTPS is issued automatically once DNS points to Netlify.

## Notes

- The Twitter and LinkedIn links use the handles from the original site; Facebook and Instagram were left out because the original links weren't valid — add them in `src/_data/site.json` once you have the correct profile URLs.
- Post cover images: posts currently render a simple icon cover instead of a photo. To use a real photo per post, add an `image` field in `src/admin/config.yml`'s field list (widget: `image`) and reference `post.data.image` in `blog.njk` and `_includes/post.njk`.
