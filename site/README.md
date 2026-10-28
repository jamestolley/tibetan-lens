# Teahouse websites

Two static brochure sites, with no build step and no JavaScript:

| Folder | Domain | Pages |
| --- | --- | --- |
| `teahouselanguages.com/` | https://teahouselanguages.com | Home (all languages, principles, contact), privacy |
| `tibetan.teahouselanguages.com/` | https://tibetan.teahouselanguages.com | Home, help & feedback, privacy policy, dictionary credits |

Each language gets its own subdomain (`hawaiian.`, `english.` later). Copy the
Tibetan folder as a starting point. `style.css` and `icon.png` are duplicated
in each folder so that each one deploys on its own. After editing
`style.css`, copy it to the other folder.

The Tibetan privacy policy (`tibetan.teahouselanguages.com/privacy.html`) is
the URL to give the Chrome Web Store.

## 1. Register the domain

Register **teahouselanguages.com**, for example at Cloudflare Registrar
(sold at cost). Using Cloudflare keeps DNS, hosting and email in one place.

## 2. Host the sites (free): Cloudflare Pages

1. Push this repository to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Create **two** Pages projects from the same repository:
   - `teahouse-languages`: build command *(none)*, output directory `site/teahouselanguages.com`
   - `teahouse-tibetan`: build command *(none)*, output directory `site/tibetan.teahouselanguages.com`
4. In each project, open Custom domains and add `teahouselanguages.com` (and
   `www.teahouselanguages.com`) or `tibetan.teahouselanguages.com`.
   Cloudflare creates the DNS records and HTTPS certificates.

Every push to the main branch redeploys both sites. (GitHub Pages also works,
but it serves one site per repository, so it would need a second repository for the subdomain.)

## 3. Email (free): Cloudflare Email Routing

Cloudflare dashboard → your domain → Email → Email Routing:

1. Enable it. Cloudflare adds the MX and SPF records.
2. Add a destination address (your Gmail) and confirm it.
3. Create routes:
   - `hello@teahouselanguages.com` → Gmail (general questions, partnerships)
   - `support@teahouselanguages.com` → Gmail (help with an extension)
4. Optional: in Gmail, Settings → Accounts → "Send mail as", add both addresses
   so replies come from them. Use Gmail's SMTP with an app password.

## 4. Google Forms (free, answers go to Google Sheets)

Create four forms at https://forms.google.com. For each one, go to Responses →
Link to Sheets so answers collect in a spreadsheet. Then go to Send → link →
shorten URL, and replace the matching placeholder in the sites:

```sh
grep -rn "REPLACE-WITH" site/
```

| Placeholder | Form | Questions |
| --- | --- | --- |
| `REPLACE-WITH-FEEDBACK-FORM` | **Teahouse — ideas & feedback** | Which extension? (Tibetan / Hawaiian / English / General) · What would make it more useful? (paragraph, required) · What do you like most? (paragraph) · Email, if you'd like a reply (short answer, optional) |
| `REPLACE-WITH-BUG-FORM` | **Teahouse — report a bug** | Which extension? · What happened? (paragraph, required) · What did you expect to happen? (paragraph) · Page address where it happened (short answer) · Extension version (short answer; shown at the bottom of Options) · Browser and operating system (short answer) · Screenshot (file upload; optional, requires sign-in, so it can be skipped) · Email, if you'd like a reply (optional) |
| `REPLACE-WITH-DEFINITION-FORM` | **Teahouse Tibetan — suggest a definition** | Tibetan word (short answer, required) · Suggested definition (paragraph, required) · Source or reasoning (paragraph) · Example sentence (paragraph) · How should we credit you? (short answer, optional) · Email (optional) |
| `REPLACE-WITH-UPDATES-FORM` | **Teahouse — launch news** | Email (short answer, required, validate as email) · Which languages interest you? (checkboxes: Tibetan, Hawaiian, English) · Are you a teacher, fluent speaker or dictionary author who'd like to help? (checkboxes) |

Forms can be **pre-filled from a link** (⋮ → Get pre-filled link), so the
extension can later open the bug form with its version and browser already
filled in.

## 5. At launch

- Replace the "Coming soon to Chrome" button on the Tibetan home page with the
  Chrome Web Store URL. The comment above the button marks it.
- Change the Tibetan card's badge on the umbrella home page from "Launching soon" to
  "Available".
- Add the Edge Add-ons link when that listing is live.
