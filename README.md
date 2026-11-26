# Art of Rikk — Exhibition Website

Made by Rikk.

An exhibition site with pages for the gallery, About, FAQ, Media Coverage and Contact.
All content lives in simple JSON files so an admin panel can edit it.

## Run it

```powershell
npm install
npm run dev
```

Then open http://localhost:3000

## Admin panel — http://localhost:3000/admin

Sign in with the password in the `.env` file (`ADMIN_PASSWORD=…`).
Change it there any time and restart the server. `.env` is private — never share or commit it
(`.env.example` shows the format).

| Section | What you can do |
|---|---|
| Dashboard | Counts, quick actions, recent artworks, a to-do checklist |
| Artworks | Add / edit / delete artworks, upload images (drag & drop), reorder within a year, search & filter |
| Exhibition Years | Each year's subtitle, cover image, intro, venue, dates, hours and essay. Years with artworks but no text are flagged |
| Media Coverage | Add press links; tick "Feature as a quote" to show a quote card |
| FAQ | Topics and questions (reorder with the arrows) |
| About Page | Mission, numbers, cards, timeline, organizers (with photos), sponsors, thanks, credits |
| Settings | Site name, tagline, email, venue, Google Form link, social links |

- Images go to `public/uploads/` (JPG, PNG, WebP or GIF, max 20 MB).
- Every save keeps a backup of the old version in `data/backups/` (last 30 per file).
- `Ctrl+S` saves the open form.

## Pages

| URL | File | Content comes from |
|---|---|---|
| `/` | public/index.html | text in the page + first featured quote from `data/media.json` |
| `/exhibition?year=2025` | public/exhibition.html | `data/exhibitions.json` (intro, venue, essay) + `data/artworks.json` |
| `/archive` (all years) · `/archive?before=2024` ("Pre-2024") | public/archive.html | `data/exhibitions.json` + `data/artworks.json` |
| `/about` | public/about.html | `data/about.json` + live numbers from artworks |
| `/faq` | public/faq.html | `data/faq.json` |
| `/media` | public/media.html | `data/media.json` |
| `/contact` | public/contact.html | `SITE` settings in public/script.js |

## Site-wide settings

`data/site.json` (edited in Admin → Settings): site name, tagline, email, venue,
Instagram / YouTube links and the Google Form link. Every page loads it via `/site-config.js`.
The navbar and footer for every page are built in `public/script.js`.

## Data files (what the admin panel will edit)

- **exhibitions.json** — one entry per year: subtitle, cover image, intro paragraphs, venue (name, address, mapUrl), dates, hours, essayTitle, essay paragraphs
- **artworks.json** — title, artists, department, award, year, type (`image`/`video`), image, videoUrl, description, order
- **media.json** — outlet, title, url, year, type (`article`/`video`/`audio`/`pdf`), featured (true/false), quote
- **faq.json** — categories, each with questions (`q`) and answers (`a`)
- **about.json** — mission, pillars, statement, timeline, organizers, sponsors, thanks, credits

## Build steps

- [x] Step 1 — Server, homepage, exhibition gallery + pop-up
- [x] Contact, FAQ, About and Media Coverage pages
- [x] Step 2 — Admin login (password-protected)
- [x] Step 3 — Admin: add / edit / delete artworks, years, media, FAQ, About and settings
- [ ] Step 4 — Put it online
