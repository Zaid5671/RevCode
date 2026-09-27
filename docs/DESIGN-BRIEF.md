# RevCode — Design Brief

What each screen contains and how it is arranged, for visual design. The behaviour behind each screen is in `PLAN.md` §8; `PLAN.md` wins if the two disagree.

**How to use this with a design AI:** paste §1 first (it sets the look for everything), then one screen at a time. Ask for desktop and phone, light and dark.

---

## 1. Look and feel

**RevCode** is a NeetCode 250 revision tracker: users mark problems solved, rate their confidence, get three spaced revisions per problem, and keep notes. They open it daily to see what to revise.

### The rule: simple, quiet, dense

The layout continues the owner's original tracker, which worked because it was **concise**: every piece of information sat where it was needed, and nothing else was on screen. The styling follows the owner's Stitch design of the Problems page (`designs/problems_pg_design/`: `screen.png` and `code.html`), in a Linear-like style: near-black layered surfaces, hairline borders, Inter with JetBrains Mono for data, one indigo accent. Where the Stitch file and this brief differ, this brief wins; it records what was deliberately left out (below).

- **Every screen, one look.** Only the Problems page has a mockup; the Dashboard, Notes, Settings, sign-in and every overlay use the same tokens, type and component styles (header, pills, chips, badges, fields, table card) described here, so they look like part of the same app. Open `designs/problems_pg_design/screen.png` when building one.
- **One glance per screen.** Each screen answers one question. Anything that doesn't help answer it is left out.
- **Compact data, readable labels.** Body text 15 px; the table 12 px (problem titles 500); column headings 11 px mono uppercase; rows about 44 px. Density comes from compact rows and tidy columns.
- **Colour only means something.** Surfaces are neutral; indigo marks what you can act on (primary button, focus, checkbox, link hover), and the status colours appear only for status and difficulty, as text or as a 10 % tint with a 22 % border.
- **Data in mono.** Dates, counts, `#`, confidence and difficulty letters use JetBrains Mono, so they line up; names and labels use Inter.
- **No decoration.** No gradients, illustrations, large icons, drop shadows or animation. Depth comes from the surface ladder and 1 px hairlines. Left out of the Stitch file on purpose: the gradient logo (a solid indigo square instead), the pulsing dots on "Saved" and "Today", the large table shadow, and the `⌘K` hint (no such shortcut exists).
- **One primary button per area** at most, in indigo.
- Branding: the name is "RevCode". NeetCode's, LeetCode's and Linear's names, logos and colours are not used as branding; problem titles link to LeetCode.

### Colours

Palette revised by the owner on 2026-09-27: light is a warm-neutral page with off-white cards and warm borders; dark follows Material's neutral greys (`#121212` page, `#1E1E1E` cards). Each token holds both through CSS `light-dark()`. The app follows the system setting unless the viewer picks Light or Dark in the account menu (remembered in this browser).

| Token | Light | Dark | Used for |
|---|---|---|---|
| bg | `#F3F2EE` | `#121212` | page background |
| header-bg | bg at 86 % | bg at 86 % | sticky header, over a blur |
| surface | `#FBFAF8` | `#1E1E1E` | table, cards, overlays, collapsed category rows |
| surface-head | `#F7F6F3` | `#1A1A1A` | column headings |
| surface-2 | `#F5F4F0` | `#242424` | open category rows |
| surface-3 | `#ECEAE5` | `#2C2C2C` | current nav link, neutral chip, checkbox |
| hover | `#F6F5F1` | `#272727` | row hover |
| field | `#FDFDFC` | `#1E1E1E` | inputs and selects |
| ink-strong | `#1A1A1A` | `#F5F5F5` | page titles, open category names |
| ink | `#2B2B2B` | `#E0E0E0` | main text |
| ink-soft | `#606060` | `#A8A8A8` | secondary text, headings, solved dates |
| ink-faint | `#737373` | `#808080` | `#`, hints, projected dates |
| ink-ghost | `#B0AAA0` | `#5C5C5C` | `-` in an unsolved row's empty cells |
| line / line-soft / line-strong | `#E7E2D8` / `#F0ECE4` / `#D6D0C4` | `#2E2E2E` / `#262626` / `#3A3A3A` | borders inside cards / row dividers / card, overlay, input and chip outlines (cards and overlays moved to line-strong, owner, 2026-09-27) |
| accent | `#4F46E5` (hover `#4338CA`) | `#6366F1` (hover `#818CF8`) | primary button, focus ring, logo, link hover |
| check / check-edge | `#6366F1` / `#7A756D` | `#6366F1` / `#3A3A3A` | the Solved checkbox: ticked fill / empty border. The fill is the dark theme's indigo in both themes (owner, 2026-09-27); the empty border stays visible in a dimmed unsolved row |
| green | `#087A5A` | `#37C98A` | done, complete, Easy, "Saved" |
| amber | `#A96500` | `#F2B84B` | due today, Medium, "Saving…" |
| rose | `#C2415A` | `#F2778A` | overdue, Hard, danger |
| blue | `#176B9A` | `#55B9E8` | tomorrow / next 7 days |

Tints: `*-bg` is the colour at 10 %, `*-edge` at 22 % (chips, badges, pills).

Radii: 4 px (badges, chips, checkbox), 6 px (nav links), 8 px (buttons, inputs), 12 px (table, cards, popovers), 16 px (dialogs), full (pills, avatar).

Spacing: a 4 px base: 4 · 8 · 12 · 16 · 24 · 32 · 48.

### Type (Google Fonts, served by `next/font`)

- **Inter**: page titles 24 px / 700, tight tracking; category names 14 px / 600; overlay headings 17 px / 600; body 15 px; table and controls 12 px; problem titles 12 px / 500; difficulty words 12 px / 500; dates in the Problems table and phone cards, with even-width digits (`tabular-nums`) so they line up.
- **JetBrains Mono**: the wordmark (16 px / 600), column headings (11 px / 600 uppercase, wide tracking), counts, `#`, confidence, the save-status pill (11 px).

### States

- **Hover:** rows lift to `hover`; nav links and ghost buttons get a faint background; links turn accent; a due pill brightens and its `○` becomes a tick.
- **Focus:** a 2 px accent outline, 2 px offset, on every focusable control; inputs also take an accent border.
- **Disabled:** 50 % opacity, not-allowed cursor.
- **Pending:** the control shows what is being saved ("Saving…", the value being sent), and the header pill shows `● Saving…`.
- **Motion:** none; overlays and menus appear instantly.

### Status and difficulty

- **Status** = a small coloured dot + a 12 px label: `● 3d late` (rose) and `● Today` (amber) in 600, `● Tomorrow` / `● Mon 28 Sep` (blue), `● 3 Oct` (ink-soft), `● Complete` (green). The dashboard, the Edit panel and phone cards use this form.
- **Next column** (Problems table) says when, not the date again: `● R2 · in 3 days`, `● R1 · today`, `● R2 · 3d late`, `● Complete`. Dot: rose overdue, amber today, blue within 7 days (tomorrow included), grey later, green complete. Only overdue (rose) and today (amber) colour the words, in 600; the rest are ink, 500 (owner decision, 2026-09-25).
- **R1–R3:** done is `✓ 18 Aug` in green; the next revision is a small bordered pill `28 Sep ○` (neutral when coming up, amber today, rose overdue), and the whole pill is the button that marks it done: the `○` becomes a tick on hover. Later revisions are a plain faint `28 Oct`, without brackets. The ✓ only ever means "done". All dates in a column start at the same left edge (owner decision, 2026-09-25).
- **Difficulty** = the word `Easy` / `Medium` / `Hard` in green / amber / rose text, with no box, everywhere it appears. A word differs from a status dot, so Hard never reads as Overdue (owner decision, 2026-09-25).
- **Confidence** = the number 1–3 in a small borderless select (its border and chevron appear on hover or focus); the words Shaky / Okay / Solid appear only in the Solve dialog, the Settings gaps grid and the landing page's gaps table (owner decision, 2026-09-25).

### Save status

A small tinted pill in the top-right of every signed-in page: `● Saved` (green), `● Saving…` (amber), `● Couldn't save — retry` (rose), in 11 px mono. The original tracker lost data without showing it; this indicator is how the new app earns trust.

---

## 2. Screens

```
Landing · Sign in · Privacy · Terms             (signed out)
Dashboard · Problems · Notes · Settings          (signed in)
Solve dialog · Edit panel · Note panel · small confirmations   (overlays)
```

**Header on every signed-in page:** sticky at the top, see-through over a blur, with a hairline border underneath. On the left a small indigo square with an "R" and the "RevCode" wordmark in mono; the links **Dashboard · Problems · Notes · Settings** as small 12 px pills (the current one on surface-3 with a border, the others ink-soft); on the right the save-status pill and the user's small round Google photo, which opens a tiny menu: name and email, a **System / Light / Dark** theme switch, Sign out, and faint Privacy · Terms links (owner, 2026-09-26). On phone, the four links become a bottom bar of four text labels with small icons.

Content width: up to 1720 px, centred, with 32 px side padding (24 px on tablets, 16 px on phones).

---

## 3. Dashboard (`/dashboard`)

**Question it answers:** "What do I revise now, what's coming, and what do I solve next?"

The layout below was approved by the owner on 2026-09-25 from a clickable mockup (`designs/dashboard_mockup.html`, "With suggestions", now "Current (live)"). It replaced an earlier version with wrapping chips. On 2026-09-26 the owner approved six refinements from the same mockup's "With changes" version: the 1280 px width, faint zeros, the pointer in an empty Revise now, the quiet ✓ Done in Coming up, "in N days" on date rows, and the Next to solve line. They are written in below.

**Width:** at most 1280 px, centred, like Problems and Notes (§4, §5).

A title row, then three blocks, top to bottom:

**Title row.** "Dashboard" (the page title style) on the left; on the right, the user's today in faint 12 px mono (`Wed 23 Sep 2026`). It explains what "Today" and "Tomorrow" mean, and a wrong time zone shows at once.

**1. Stats strip.** Five tiles joined into one bordered strip (12 px radius, hairlines between them). On phone, Solved spans the full width and the other four form a 2 × 2 grid. Each tile shows a big number (Inter 600, 28 px) and a label in 11 px mono uppercase, faint:

| Solved | Overdue | Due today | Next 7 days | Complete |
|---|---|---|---|---|
| **86** / 250 · label `Solved · 34%` (the `/ 250` smaller and faint) | **2** (rose when > 0) | **1** (amber when > 0) | **4** (blue when > 0; includes tomorrow) | **21** (green when > 0) |

A zero is faint (ink-faint): it isn't news, so only the counts that matter stand out. Solved stays in ink-strong, even at 0.

**2. Next to solve.** One quiet line under the stats (surface, `line` border, 12 px radius, 16 px above it): `NEXT TO SOLVE` (11 px mono uppercase, faint) · the title (13 px, 500, links to LeetCode) · the difficulty word · the category in 11 px faint; at the right, a text link **Open in Problems →** (ink-soft, accent on hover), which opens the Problems page searched for that problem. It's the first unsolved problem in NeetCode order, so a new user sees problem 1. While it loads, a plain placeholder keeps its space; it's left out when it can't load or once all 250 are solved. On phone the link wraps to its own line.

```
NEXT TO SOLVE   Longest Common Prefix   Easy   Arrays & Hashing                Open in Problems →
```

**3. Lists.** "Revise now" and "Coming up" are two bordered cards, side by side on wide screens (Revise now wider, 3 : 2) and stacked below 1024 px. Each card has a heading bar on surface-head: the name in 11 px mono uppercase (ink-soft) and the item count in faint mono. Items are rows, like the Problems table: about 52 px tall, soft dividers, row hover.

```
REVISE NOW  3                                           COMING UP  4
Permutation in String       M  R1  ● 3d late  📝 [✓ Done]   TOMORROW
Sliding Window                                              Group Anagrams      M  R1  📝 [✓ Done]
Valid Parentheses           E  R2  ● 1d late  📝 [✓ Done]   Arrays & Hashing
Stack                                                       FRI 25 SEP · in 2 days
Majority Element            E  R1  ● Today    + [✓ Done]    Two Sum             E  R2  📝  ✓ Done
Arrays & Hashing                                            …
```

- **Each row:** the problem title (13 px, 500, links to LeetCode) with its category under it in 11 px faint; the difficulty badge; `R1` / `R2` / `R3` in faint mono; the status label (Revise now only); the Notes button (📝 when a note exists, `+` when not); and a small **✓ Done** button (surface-3 with a `line-strong` border, turning green on hover; not indigo). **✓ Done** opens a tiny popover: a date field set to today, then **Done**.
- **Revise now:** overdue and due-today revisions, most overdue first. Each row keeps its status label (`● 3d late`, `● Today`).
- **Coming up:** tomorrow and the next 7 days, grouped under date rows in 11 px mono uppercase, faint, on surface-head (`Tomorrow`, `Fri 25 Sep · in 2 days`, `Wed 30 Sep · in 7 days`; the `· in N days` part in 500 and normal case, and not on Tomorrow). The rows have no status label, since the date row says it. Their **✓ Done** is quiet: no border or background (ink-faint) until the row is hovered or the button focused, then the usual surface-3 and `line-strong` border; on touch screens, with no hover, it always has them. So Revise now's ✓ Done reads as the main action.
- No coloured left border: the status dot and label, or the date row, carry the status.
- **Phone:** each row takes two lines: title and category, then Notes and ✓ Done on the right; below, the badge, `R1` and the status label.
- **Empty:** inside the card, one faint line: "Nothing to revise today — nice." / "Nothing scheduled this week." When Revise now is empty but Coming up isn't, its line goes on in ink-soft to name the first revision coming up: "Next up tomorrow: **Group Anagrams**." or "Next up on Fri 25 Sep: **Two Sum**." (the title links to LeetCode).

A **brand-new user** (nothing solved) sees the stats at zero, Next to solve (problem 1), and one dashed-border line in place of both cards: "Mark a problem solved on the **Problems** page to start your revision schedule."

**Loading:** the numbers show a faint `–`, and each card shows three plain grey placeholder lines (no animation). **Error:** the numbers show `–`, and one rose-tinted line replaces the cards: "Couldn't load your reminders." with **Try again**.

**Sample data** (today = Wed 23 Sep 2026):

| List | Problem | Rev | Status |
|---|---|---|---|
| Revise now | Permutation in String | R1 | 3d late |
| Revise now | Valid Parentheses | R2 | 1d late |
| Revise now | Majority Element | R1 | Today |
| Coming up · Tomorrow | Group Anagrams | R1 | Tomorrow |
| Coming up · Fri 25 Sep | Two Sum | R2 | Fri 25 Sep |
| Coming up · Fri 25 Sep | Implement Stack Using Queues | R2 | Fri 25 Sep |
| Coming up · Wed 30 Sep | Valid Anagram | R3 | Wed 30 Sep |

---

## 4. Problems (`/problems`)

**Question it answers:** "Where am I on every problem?" This is the original tracker's table, cleaned up.

**Controls row** (one line that wraps on small screens): a search box · **Category** · **Difficulty** · **Status** (All / Unsolved / Overdue / Today / Tomorrow / Next 7 days / Later / Complete / Has notes) · **Sort** (NeetCode order / Next due) · an "Expand all / Collapse all" button with an icon, at the right. The search box has a magnifier icon; each select has its own chevron. All are 12 px on the `field` colour with a `line-strong` border.

**Width:** the Problems page (title, controls row and table) is at most 1280 px wide and centred, narrower than the other pages, so the Problem column doesn't stretch into a wide gap on big screens (owner decision, 2026-09-25).

**Table:** one bordered card (12 px radius); column headings in 11 px mono uppercase on surface-head, sticky under the app header; 12 px rows about 44 px tall with soft dividers; row hover in `hover`. Column widths: # 48 · Problem ≥ 240 · Diff 80 · Solved 128 · Conf 64 · R1–R3 112 each · Next 144 · Notes 64 px; #, Diff, Conf and Notes are centred.

```
 #   Problem                     Diff  Solved     Conf  R1        R2        R3        Next            Notes
▾ Arrays & Hashing                                                           5 / 22   ● 1 due
 1   Concatenation of Array      Easy    ☑ 1 Sep    1     ✓ 2 Sep   ✓ 6 Sep   ✓ 16 Sep  ● Complete          📝
 2   Contains Duplicate          Easy    ☑ 12 Sep   2     ✓ 15 Sep  ✓ 22 Sep  [6 Oct ○] ● R3 · in 13 days   +
 4   Two Sum                     Easy    ☑ 16 Sep   2     ✓ 18 Sep  [25 Sep ○] 9 Oct    ● R2 · in 2 days    📝
 5   Longest Common Prefix       Easy    ☐                                                                  (+ on hover)
 6   Group Anagrams              Medium  ☑ 19 Sep   3     [24 Sep ○] 8 Oct    7 Nov     ● R1 · tomorrow     📝
```

(Today = Wed 23 Sep. `[ ]` marks the due pill.)

- **Categories are collapsible folders**, and there is no pagination. Each category is a header row: a chevron icon and the name (14 px, 600; ink-strong on surface-2 when open, ink on surface when closed) on the left, followed by a mono `7 / 22` count in a small rounded pill (surface-3, `line-strong` border), and at the far right a tinted `● N due` pill (overdue + due today, the same items as the dashboard's "Revise now"; coloured by the most urgent) when any are waiting. There are no separate cards or progress bars. Clicking the header opens or closes its problems. While scrolling, the current category's header sticks under the column headings.
  - A first visit shows **all 18 categories collapsed**: a clean overview that fits on one screen:

    ```
    ▸ Arrays & Hashing (5 / 22)             ● 1 due
    ▸ Two Pointers (3 / 13)
    ▸ Sliding Window (1 / 9)                ● 1 due
    ▸ Stack (4 / 15)                        ● 1 due
    ▸ Binary Search (0 / 14)
    …
    ```
  - The app remembers which categories were left open (in this browser).
  - Searching or filtering opens only the categories with matches and hides the rest; clearing restores the previous open/closed state.
- **#** is faint mono. The **Problem** title is an ink link (weight 500) to LeetCode (accent and underlined on hover), followed by a tiny `Premium` tag on the 7 premium problems.
- **Diff** is the coloured word (§1 "Status and difficulty").
- **Solved** is a checkbox; once ticked, the date appears beside it in soft Inter. Ticking opens the Solve dialog.
- **Conf** is a small select (1 / 2 / 3) in plain ink mono, editable any time.
- **R1–R3:** `✓ date` (green) when done; the **next** revision is the `28 Sep ○` pill, which is the button that marks it done; later revisions show a faint plain date.
- **Next** shows the relative label (`● R2 · in 3 days`, §1).
- **Notes** shows `+` (faint) or 📝 (ink, clearly visible); either opens the Note panel.
- **Unsolved** rows are dimmed (75 %), with a softer title; the cells after Solved are blank, and the difficulty keeps its colour. Complete rows are not faded (the Stitch design; owner decision, 2026-09-25).
- The `+` for a new note is always shown on solved rows; on unsolved rows it appears on row hover or keyboard focus. The 📝 of an existing note is always shown (owner decision, 2026-09-25).
- Clicking a row's empty space opens the **Edit panel** for less common changes.

**Phone:** each row becomes a compact two-line card:

```
4  Two Sum  Easy                              📝
☑ 16 Sep · conf 2 · R1 ✓ 18 Sep · ● R2 Fri 25 Sep ○
```

The card keeps the dated status label (it has no R1–R3 columns), and its `○` button marks the revision done.

**Sort "Next due first":** the folders give way to one flat list, most urgent first, with each problem's category in small faint text under its title, except when one category is already chosen (owner decision, 2026-09-25).

**Filters match nothing:** "No problems match." with a Clear link.

---

## 5. Notes (`/notes/[category]`)

**Question it answers:** "What did I write about this topic?"

The layout below was approved by the owner on 2026-09-26 from a clickable mock-up (`designs/notes_mockup.html`).

- **Width:** the page is at most 1280 px wide and centred, like Problems (§4).
- **`/notes`** opens the first category that has notes, or Arrays & Hashing when there are none.
- **Left column** (240 px, 56 px gap), sticky under the app header while the document scrolls: the "Notes" page title; a "Search notes…" box at the top; the 18 categories as a plain list with a faint mono count (`Arrays & Hashing  4`; no count when 0). The current category is ink-strong on surface-2 with an accent left bar; categories with no notes are faint. At the bottom a text link, "Download all notes (.md)", greyed out when there are no notes.
- **Right column:** the category as one page, filling the rest of the width:
  - A page title, "Arrays & Hashing", with a small "Download .md" link beside it (only when the category has notes).
  - Under it, a line: `4 of 22 problems have notes` on the left; on the right the **Expand all** pill (below), a 32 px gap, then the label "Show problems without notes" followed by its on/off switch at the far right (label first, so the switch never reads as Expand all's; owner decision, 2026-09-26); then a hairline.
  - Each problem with a note is a **card** (surface, `line` border, 12 px radius, 16 px apart; space, not a line, separates notes). Its **header strip** (surface-head, hairline under it) holds `4.` (faint mono) · the title as a LeetCode link with `↗` · the difficulty word · `Conf 2` (faint mono, solved problems only); on the right, a faint `edited 23 Sep` (for today, the time: `edited 10:42 PM`, as the Note panel's "Saved" does) and an **Edit** link. The formatted note fills the card body.
  - **Long notes** (taller than 320 px: the 280 px preview plus 40 px of slack) start as a 280 px preview that fades into the card, with a **Show more** pill under it; clicking the preview also opens it (links and text selection in it work as usual). Open, the note ends with **Show less**, which collapses it and scrolls back to its card's top. Short notes show in full, with no button. **Expand all / Collapse all** (a bordered pill like Show more, beside the switch) appears when the category has a long note; Collapse all scrolls back to the top. Nothing is remembered between visits (owner decision, 2026-09-26, from the mock-up).
  - With the switch on, problems without a note are slim cards: the header line alone (no tint), softer, with a dashed **+ Add note** button.
  - Edit, + Add note and a search result open the Note panel (§7); after a save, the page and the counts refresh.
- **Search** (problem names and note text, ignoring case): while the box has text, the right column shows results instead of the category: `3 notes match "hash"`, then one row per note in catalog order: the title, difficulty, `category · edited date`, and the snippet with the match highlighted (amber tint). A match on the name alone is marked `name match`. Clicking a row opens the note. Clearing the box (× button) brings the category back. The search waits 250 ms after typing and is kept in the address (`?q=`), so Back and refresh keep it. No match: "No notes match "…"."
- **Formatted note style:** the Note panel's preview (`MarkdownView`): Inter 15 px text, Inter 600 for note headings, a note's own `---` as a faint dashed rule (`line-strong`, so it never looks like a card edge), inline code and code blocks in JetBrains Mono on surface-2 (blocks with an 8 px radius).
- **Phone:** the category list becomes a dropdown (with counts) under the search box; the Edit line wraps under the title.
- **Empty category:** "No notes here yet. Add one with the **+** in the Notes column on the Problems page."
- **No notes at all:** a dashed box: "You haven't written any notes yet. On the **Problems** page, use the **+** in the Notes column to add one."
- **Loading:** grey placeholder lines (no animation). **Error:** a rose line "Couldn't load your notes." with **Try again**.

Sample note (Two Sum):

```
## Approach
One pass with a hash map: value → index. For each number, check if
target − number is already in the map.

**Time** O(n) · **Space** O(n)

    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen: return [seen[target - n], i]
        seen[n] = i
```

---

## 6. Settings (`/settings`)

**Question it answers:** "How does RevCode schedule my revisions, and whose account is this?"

The owner approved nine changes to the first version of this section on 2026-09-25 (no mockup); they are written in below.

The "Settings" title, then one narrow column (max 640 px); **the title and the column are centred together** on the page (owner decision, 2026-09-25, after seeing it left-aligned: a left-aligned column left a wide empty area on the right; two columns were also considered). The title therefore sits further right than on the other pages; that was accepted. Each section is a **bordered card** like the Dashboard's (surface, 12 px radius, hairline border): a heading (Inter 14 px / 600, ink-strong), a one-line explanation in ink-soft, then its controls. 24 px between cards.

1. **Revision gaps.** A small grid like the original tracker's: Confidence | R1 | R2 | R3 | If on time. Rows: `1 Shaky` · 1 / 4 / 10, `2 Okay` · 3 / 7 / 14, `3 Solid` · 5 / 14 / 30, with small mono number inputs. The **If on time** column shows the days from solving, in faint mono (`day 3 · 10 · 24`), and updates as you type; on phones it moves to a faint line under its row, so the grid fits at 360 px.
   - Explanation line: "Days from the previous step to each revision. Changing them moves upcoming due dates; completed revisions stay as they are."
   - A small "Why these numbers?" link opens the reasoning in place (`PLAN.md` §4.1) and closes it again.
   - Beside the heading, a faint mono label: `Defaults` or `Custom`.
   - An invalid box gets a rose border, and one rose line under the grid says "Each gap is a whole number of days from 1 to 180."
   - **Save** (the card's one indigo button) is inactive until something changes, and while any box is invalid. Beside it: `Saving…` (amber), `Saved` (green) or the error (rose).
   - **Reset to defaults** is a text link, hidden while the defaults are in use. It asks first ("Reset your gaps to the defaults? Upcoming due dates will move." [Cancel] [Reset]), then saves at once.
2. **Time zone.** One select listing every IANA zone, e.g. "Asia/Kolkata"; picking one saves at once, with the same status beside it. Under it, in faint 12 px mono: "Today for you: Fri 25 Sep 2026". When the saved zone differs from this device's, a text link offers "Use this device's time zone (Asia/Kolkata)".
3. **Account.** Photo, name and email, and a **Sign out** button.
4. **Delete account.** Explanation: "Deletes your progress, gaps and notes for good. This can't be undone." A text link "Download your notes first (.md)", then a rose text button **Delete account…** that opens a confirmation where the user types "delete". If the user signed in more than a day ago, the dialog instead says "For safety, sign in again to delete your account" with a **Sign in** button.

**Loading:** each card shows its heading and plain grey placeholder lines (no animation). **Error:** a rose-tinted line inside the card: "Couldn't load your settings." with **Try again**.

---

## 7. Overlays

All are small, surface-coloured, 16 px radius, hairline border, dim backdrop. On phone they become bottom sheets.

**Solve dialog** (after ticking Solved):

```
Two Sum — how did it go?
Solved on  [ 23 Sep 2026 ]
[ 1 · Shaky ]  [ 2 · Okay ]  [ 3 · Solid ]
First revision: tomorrow / in 3 days / in 5 days
```

Clicking a confidence button saves immediately and closes the dialog. The hint line under each button is faint.

**Edit panel** (click a row; slides in from the right, 400 px wide):
- The title and `E` badge at the top.
- Solved date and confidence fields.
- Three plain lines, one per revision: `R1  ✓ 18 Sep  [edit] [undo]` · `R2  due Fri 25 Sep  [✓ done]` · `R3  (9 Oct)`.
- Error messages appear in rose right under the field they concern.
- At the bottom, a rose text link: "Unmark solved (your note is kept)".

**Note panel** (slides in from the right, 560 px wide; on phones a sheet the full height of the screen, so there is room to type with the keyboard open). The owner approved twelve additions on 2026-09-25 (no mockup); they are written in below.
- **Header**, like the Edit panel's: the title as a LeetCode link with `↗`, the difficulty badge and ✕; the category under the title in faint 11 px.
- Small **Write | Preview** tabs. An empty Preview says "Nothing to preview yet."
- A single-row toolbar (Write only) of seven small 28 px square buttons: **B** · *I* · H · bullet list · numbered list · code · link. Each has a tooltip and an accessible name ("Bold (Ctrl+B)"); Ctrl/Cmd+B and Ctrl/Cmd+I work in the text area. With nothing selected, a button inserts placeholder text, selected so you can type over it. **H** starts the line with `###`, so a note's headings sit under its problem (`##`) in a downloaded `.md` file. **Code** wraps a one-line selection in backticks, and an empty or multi-line selection in a fenced block.
- A plain text area filling the panel: JetBrains Mono 13 px, long lines wrap, no border (the panel is its frame). Tab moves focus, as everywhere else.
- A bottom bar: the save status on the left, then a character counter from 18,000 characters (`18,240 / 20,000`, faint mono; rose over the limit, when Save is disabled); **Save** and a faint "Delete" on the right. Save (or Ctrl/Cmd+S) keeps the panel open.
  - Status: `No note yet` (faint) · `Unsaved changes` (ink-soft) · `Saving…` (amber) · `Saved 10:42 PM` (green; an older note shows `Saved 23 Sep`) · `Couldn't save — your text is still here` (rose; Save again retries). Note saves also show in the header's save pill.
  - "Delete" shows only when a saved note exists, and asks first: "Delete your note for Two Sum? This can't be undone." [Cancel] [Delete] (rose). Saving empty text asks the same question, since an empty save deletes the note.
- **Closing with unsaved changes** (✕, Escape or a backdrop click) asks "Discard your unsaved changes?" [Keep editing] [Discard] (rose). Closing or reloading the browser tab warns too.
- **Changed elsewhere:** a one-line amber banner at the top: "Changed in another tab or device. **Load the newer version** · **Keep mine and overwrite**", or, when it was deleted there, "Deleted in another tab or device. **Discard mine** · **Save mine again**". The note is checked again when you come back to the tab: with no unsaved edits, the newer version loads quietly; with unsaved edits, the banner shows at once instead of at Save.
- **Loading:** the text area is disabled and the bottom bar says "Loading note…". **Error:** a rose line, "Couldn't load this note." with **Try again**; the editor stays locked, so a note it hasn't seen can't be overwritten.

**Confirmations** are one sentence plus two buttons, e.g. "Unmark Two Sum as solved? Your note is kept." [Cancel] [Unmark] (the second in rose).

---

## 8. Sign in, Privacy, Terms

- **Sign in:** centred on the paper background: the wordmark and a small graph logo (like the original tracker's node graph), a one-line description ("Spaced revision for the NeetCode 250, with notes."), a **Continue with Google** button, and faint Privacy · Terms links. Nothing else.
- **Privacy / Terms:** a single reading column of text (max 680 px): a page title, a "Last updated" date, then headings and paragraphs.
- **404:** "Page not found" with a link back to the Dashboard.

---

## 9. Landing page (`/`)

**Question it answers:** "What is RevCode, and why should I sign in?"

Owner-approved (2026-09-27) from `designs/landing_mockup.html`. Public; signed-in visitors skip it for `/dashboard`.

- **Always dark,** whatever the visitor's system or saved theme: there is no theme switch on this page, and the dark screenshots are the stronger ones. The same dark tokens as the app; the rules of §1 hold (no gradients, shadows, illustrations or animation).
- **Top bar:** the indigo "R" square and "RevCode" wordmark on the left, a quiet **Sign in** link (to `/sign-in`) on the right. Sticky, like the app header.
- **Hero, centred:** a small mono caption "NeetCode 250 · spaced revision"; the headline **"Revise, don't Relearn."** (the owner's line; 40–64 px, 700, tight tracking); one line of explanation; the indigo **Continue with Google** button with Google's "G"; a faint "Free · sign in with Google, no password" under it.
- **Dashboard screenshot,** large, framed like a card (12 px radius, line-strong outline).
- **How it works:** three steps, text and picture side by side, alternating sides (stacked on phones): `01 Solve` with the Problems screenshot, `02 Revise` with a small table of the default revision gaps (the only place outside the Solve dialog and Settings that uses the words Shaky / Okay / Solid), `03 Note` with the Notes screenshot. The two smaller screenshots are cropped to 16:10 from the top.
- **Closing:** "Your next revision is waiting." with the sign-in button again.
- **Footer:** "RevCode · not affiliated with NeetCode or LeetCode", Privacy · Terms.
- **Screenshots** are the owner's, in `public/landing/` (`dashboard.png`, `problems.png`, `notes.png`, dark theme). They currently show Next's dev-tools badge in the bottom-left; replacing them later is a file swap.
