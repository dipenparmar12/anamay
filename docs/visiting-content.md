# Visiting Anāmay Ashram: keeping the page up to date

The page [`visiting.html`](../website/visiting.html) (English) and its Hindi twin `visiting-hi.html` answer the questions that first-time visitors ask on WhatsApp: how to stay, what it costs, the 1-week programme, the daily schedule and the dates. **Nothing on it is typed into the page code.** Prices, times, dates, rules and every sentence are data files that an editor changes on GitHub; the site rebuilds and publishes itself within a couple of minutes.

## Where each thing lives

| To change | Edit | Notes |
|---|---|---|
| Room charges, Panchakarma charge, programme fee, the extra ₹1,300 for a missed class | [`content/visiting.json`](../content/visiting.json), block `amounts` | All the money in one place. Numbers only, no ₹ and no commas |
| Minimum stay (4 days / 3 nights) | `visiting.json`, block `stay` | |
| When the 1-week programme starts and ends (Sunday 4:00 PM, Saturday 10:00 PM) | `visiting.json`, block `week` | `day` is an English weekday in lower case, `time` is 24-hour `HH:MM` |
| Any sentence, in English and Hindi | `visiting.json`, the `en` and `hi` lines | Both are required. See *Writing text* below |
| The daily schedule of the 1-week programme | `visiting.json`, block `schedule.items` | One entry per class: `from`, `to` (24-hour `HH:MM`), `title`, optional `note` |
| Course dates | [`content/course-dates.csv`](../content/course-dates.csv) | One line per course: `start,end`. Used by the Visiting page and by the Volunteer page |
| Email address, WhatsApp number, phone numbers | [`content/site.json`](../content/site.json), block `contact` | The same values feed the whole website |
| The message that WhatsApp buttons start with | `site.json`, `contact.whatsappMessages` | `general`, `stay`, `application`, each in `en` and `hi` |
| The day schedule on the home page | [`content/daily-schedule.csv`](../content/daily-schedule.csv) | `time,label,title,description` |
| The day of a volunteer on the Volunteer page | [`content/volunteer-day.csv`](../content/volunteer-day.csv) | Same columns |

To edit without tools: open the file on GitHub, press the pencil icon, change it, choose **Commit changes**. If something is wrong the build stops and the *Actions* tab says which file and which line (see *When something is wrong*), so a typo cannot publish a broken page.

## Common changes

**A price changes.** Change the number in `amounts`. Every place that shows it follows, in both languages, including the sentences that mention it (for example "Accommodation is charged at ₹900 per day" and the Volunteer page).

**A room type is added.** In `guest.rooms` copy an entry, give it a `name` in English and Hindi, and set `amount` to a name from `amounts` (add the price there first, as a number or a list of numbers). A list shows all its prices (two with "or", more with spaces); the room also appears in the enquiry form's *Room preference*.

**A date is added or removed.** Add a line `2028-02-06,2028-02-12` to `course-dates.csv` (dates may also be written `06-02-2028`, day first). Order does not matter. **Do not delete dates that are over.** They stay as history and fold away by themselves: the page compares each date with the visitor's own today, so the *Next course* label moves on without anyone touching the file. Earlier dates are one button ("Show earlier dates") away. The Volunteer page lists only the dates still to come and says so when there are none.

**A class is added to the schedule.** Add an entry to `schedule.items`, in time order, with its English and Hindi `title`. Entries before 12:00 appear under *Morning*, 12:00–16:59 under *Afternoon*, from 17:00 under *Evening*.

**A treatment is added to Panchakarma.** Add `{ "name": …, "text": … }` (each with `en` and `hi`) to one of the two groups in `panchakarma.groups`.

## Writing text

Every text is a pair, and both languages are required, so the two pages can never drift apart:

```json
"note": { "en": "Hindi with English translation", "hi": "हिंदी में, अंग्रेज़ी अनुवाद सहित" }
```

Inside a text, `{name}` is replaced by a value from the data, so a sentence never repeats a number that lives elsewhere:

| Write | Shows |
|---|---|
| `{shared}`, `{extraPerson}`, `{panchakarma}`, `{weekFee}`, `{missedWeekExtra}` | The price, in bold, as ₹900, ₹1,300 and so on |
| `{minDays}`, `{minNights}` | 4 and 3 |
| `{treatmentsMin}`, `{treatmentsMax}` | 4 and 5 (`panchakarma.perDay`) |
| `{weekStart}`, `{weekEnd}` | *Sunday, 4:00 PM* in English, *रविवार शाम 4:00 बजे* in Hindi |
| `{years}` | 2026–2028, taken from the course dates |

Other pages can use the same values: `{{visiting:weekFee}}`, `{{visiting:shared}}`, `{{visiting:weekStart}}`. The Volunteer page does.

Times are written once, in 24-hour form, and shown for each language: *7:00 – 8:30 AM* in English, the plain numbers in Hindi with *सुबह / दोपहर / शाम* as the heading above them.

## The two languages

- `visiting.html` is English and `visiting-hi.html` is Hindi, built from the same data. The prices, times and dates cannot differ because they are not typed twice.
- A switch at the top of each page (English | हिन्दी) leads from one to the other. Both are in the *Stay* menu. The pages declare each other for search engines (`hreflang`) once the site's address is set.
- The menu, footer and floating buttons stay in English on the Hindi page and are marked `lang="en"` so screen readers pronounce them correctly. Hindi gets its own spacing and line height; Devanagari must not be letter-spaced.
- The sentences supplied by the ashram are used as written. The labels, the treatment descriptions, the enquiry form and a few notices were **translated for the website and should be read by a Hindi speaker** before the page is promoted.

## WhatsApp: messages that are ready to send

Every WhatsApp button on the site opens WhatsApp with a message already typed, which the visitor can still change before pressing send. The messages are in `site.json`:

| Name | Used by |
|---|---|
| `general` | The floating button, the menu, the footer, the contact and home pages |
| `stay` | The Visiting pages (and their floating button) |
| `application` | The Volunteer page: Name, date, time and place of birth, address, email, preferred dates, to fill in |

On the Visiting page, **Enquire About Your Stay** has fields (type of stay, arrival date, number of people, room preference). They write the message, which sits in a box the visitor may edit. *Send on WhatsApp* and *Send by email* carry exactly that text. Once the visitor edits the message by hand the fields stop overwriting it, and *Rebuild the message* brings it back. Without JavaScript the two buttons still open a ready-made message. Sending an enquiry does **not** reserve a room, and the page says so.

In `stay`, `{details}` marks where the filled-in lines go.

## When something is wrong

The build checks the data before it writes any page and stops with a plain message, for example:

```
content/visiting.json: guest.rooms[0].name.hi is missing or empty (every text needs both English "en" and Hindi "hi")
content/visiting.json: volunteer.policy.items[1].en uses {sharedRate}, which is not a value (the values are shared, extraPerson, …)
content/visiting.json: schedule.items[1] starts before the entry above it ends (list the day in time order)
content/visiting.json: amounts.shared must be a whole number of 1 or more (it is 899.5)
content/course-dates.csv line 31: "2027-02-30" is not a date (write it like 2027-03-15)
```

It also catches a missing or empty text, an unknown `{name}`, a price that is missing or not a whole number, a room pointing at a price that does not exist, a time that is not `HH:MM`, a schedule out of order or overlapping, an unknown weekday, a photograph that is not in `website/assets/img`, a course that ends before it starts and one date listed twice. To check before committing: `cd website && npm run build`.

## What is not built: an admin screen

The editing described above is the "simple configuration file" step: structured, documented, validated, and published by the existing deployment. A screen where authorised people edit these values in a browser is **not** built. A static website cannot save what a browser sends it, so a real admin screen needs a place to store the change and a login in front of it. The least risky way, if the ashram wants it, is a Git-based editor such as Decap CMS: editors sign in with GitHub, the screen edits `visiting.json` and the CSV files as forms, and every save is a commit that the existing workflow publishes. It needs no database and no server of ours, but it needs a GitHub OAuth app to be created by the repository owner. A login screen on the PHP API would also work but means passwords, sessions and a way to trigger a rebuild, which is more to secure and to keep running.
