# Chrome Web Store listing: Teahouse Tibetan

Copy for each field of the Chrome Web Store developer dashboard. The name and
short summary come from the extension itself (`_locales/*/messages.json`) and
are already translated into every UI language. The Edge Add-ons listing uses
the same text.

## Store listing tab

**Name** (from the manifest): Teahouse Tibetan: Dictionary & Learning Companion

**Summary** (from the manifest, 132 characters max): Read Tibetan on any web page: word spacing, instant
definitions, a dictionary, and saved words with spaced-repetition review.

**Category:** Education

**Language:** English (the localized summaries are picked up from `_locales`)

**Description:**

```
Teahouse Tibetan helps you read Tibetan anywhere on the web, and remember what you learn.

Tibetan is written without spaces between words, so finding where one word ends is half the work. Teahouse does that part for you, then helps you build your vocabulary as you read.

READ
• Word spacing: Tibetan on any web page is split into words with the botok word segmenter.
• Instant definitions: click or hover a word for its meaning, Wylie transliteration and pronunciation.
• Color by part of speech (optional) shows the shape of a sentence at a glance.
• Translate a sentence: click the shad (།) at the end of any sentence to open it in Google Translate.

LOOK UP
• A full dictionary page: search by Tibetan script, Wylie or English.
• Definitions from open dictionaries: 84000, Jeffrey Hopkins' Tibetan-Sanskrit-English Dictionary, Esukhia's botok data and hand-curated entries.

LEARN
• Save words with one click while you read.
• Review with flashcards scheduled by FSRS, the modern spaced-repetition algorithm, so each word comes back just before you'd forget it.
• Save as many words as you like. New words join your reviews a few at a time (you choose how many per day), so reviews never pile up.
• Mark words you already know. On every page, known words fade to plain text and words you're learning are underlined, so new words stand out.
• Back up your words, move them to another computer, or import lists from CSV and Anki.

PRIVATE BY DESIGN
• Everything runs in your browser. The dictionaries are packaged with the extension.
• No account, no ads, no analytics, no tracking.
• Your saved words stay on your computer. Nothing is sent anywhere unless you click "Translate this sentence".

FREE FOREVER
Reading help, the dictionary, saving words and review are free, with no limit on how many words you can learn.

The interface is available in English, Chinese (simplified and traditional), Japanese, Korean, Hindi, Russian, Ukrainian, Polish, Czech, German, French, Spanish, Italian, Dutch and Portuguese. Definitions are in English.

Help, feedback and bug reports: https://tibetan.teahouselanguages.com/support.html
Privacy policy: https://tibetan.teahouselanguages.com/privacy.html

Teahouse Tibetan is part of Teahouse Languages (https://teahouselanguages.com).
```

**Graphic assets** (still to make):

| Asset | Size | Suggested content |
| --- | --- | --- |
| Store icon | 128×128 | `public/icons/icon128.png` (already in the package) |
| Screenshot 1 | 1280×800 | A Tibetan news or dharma page with spaced words and an open definition pop-up |
| Screenshot 2 | 1280×800 | The Dictionary page with a search (e.g. "compassion") |
| Screenshot 3 | 1280×800 | My words: stage tabs and the list |
| Screenshot 4 | 1280×800 | A flashcard review with the four grade buttons |
| Screenshot 5 | 1280×800 | "Translate this sentence" pop-up on a shad |
| Small promo tile | 440×280 | Icon, "Teahouse Tibetan", "Read Tibetan anywhere on the web" |
| Marquee (optional) | 1400×560 | Same message, wider, with a Tibetan sentence |

**Official URL / Homepage:** https://tibetan.teahouselanguages.com/
**Support URL:** https://tibetan.teahouselanguages.com/support.html

## Privacy practices tab

**Single purpose:**

```
Help people read and learn Tibetan on web pages: it splits Tibetan text into words, shows dictionary definitions, and lets the user save words and review them with flashcards.
```

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `storage` | Saves the user's settings (sync storage) and the words they choose to save, with their review history (local storage). |
| `activeTab` | Lets the popup refresh the annotations on, or insert sample text into, the page the user is viewing, and read that page's hostname for "Pause on this site". |
| Host permission (content script on all URLs) | Tibetan text can appear on any website. The content script checks each page for Tibetan characters and, only if it finds some, splits that text into words and shows definitions on the page. Page content is processed locally and never stored or transmitted. |

**Remote code:** No, I am not using remote code. All JavaScript and dictionary data are packaged in the extension.

**Data usage:** tick none of the data categories. The extension does not collect or transmit:
personally identifiable information, health, financial, authentication, personal communications,
location, web history, user activity or website content.

Certify all three statements:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://tibetan.teahouselanguages.com/privacy.html

## Distribution tab

- Visibility: Public (or Unlisted for a soft launch with friends and teachers first)
- Regions: All regions
- Pricing: Free

## Before submitting

- [ ] Register teahouselanguages.com, deploy both sites and set up email (`site/README.md`)
- [ ] Create the four Google Forms and replace the `REPLACE-WITH` links
- [ ] Native-speaker review of the UI translations (at least English, Tibetan text, Chinese)
- [ ] Make the screenshots and promo tile
- [ ] `npm run build`, then upload the generated zip from `dist/chrome/`
