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

Dark is the Stitch design; light is its counterpart. Each token holds both through CSS `light-dark()`. The app follows the system setting unless the viewer picks Light or Dark in the account menu (remembered in this browser).

| Token | Light | Dark | Used for |
|---|---|---|---|
| bg | `#F6F7F9` | `#090A0D` | page background |
| header-bg | white 80 % | `#0D0E12` 80 % | sticky header, over a blur |
| surface | `#FFFFFF` | `#111216` | table, cards, overlays, collapsed category rows |
| surface-head | `#F9FAFB` | `#0E0F13` | column headings |
| surface-2 | `#F3F4F6` | `#14161C` | open category rows |
| surface-3 | `#ECEEF2` | `#1A1C24` | current nav link, neutral chip, checkbox |
| hover | `#F5F6F8` | `#171922` | row hover |
| field | `#FFFFFF` | `#111318` | inputs and selects |
| ink-strong | `#0F172A` | `#FFFFFF` | page titles, open category names |
| ink | `#1E293B` | `#E2E8F0` | main text |
| ink-soft | `#475569` | `#94A3B8` | secondary text, headings, solved dates |
| ink-faint | `#64748B` | `#64748B` | `#`, hints, projected dates |
| ink-ghost | `#A3ACB9` | `#475569` | `-` in an unsolved row's empty cells |
| line / line-soft / line-strong | `#E5E7EB` / `#EEF0F3` / `#D1D5DB` | `#20222A` / `#1B1D24` / `#2A2D39` | borders / row dividers / input and chip borders |
| accent | `#4F46E5` (hover `#4338CA`) | `#6366F1` (hover `#818CF8`) | primary button, focus ring, checkbox, logo, link hover |
| green | `#047857` | `#34D399` | done, complete, Easy, "Saved" |
| amber | `#B45309` | `#FBBF24` | due today, Medium, "Saving…" |
| rose | `#BE123C` | `#FB7185` | overdue, Hard, danger |
| blue | `#0369A1` | `#38BDF8` | tomorrow / next 7 days |

Tints: `*-bg` is the colour at 10 %, `*-edge` at 22 % (chips, badges, pills).

Radii: 4 px (badges, chips, checkbox), 6 px (nav links), 8 px (buttons, inputs), 12 px (table, cards, popovers), 16 px (dialogs), full (pills, avatar).

Spacing: a 4 px base: 4 · 8 · 12 · 16 · 24 · 32 · 48.

### Type (Google Fonts, served by `next/font`)

- **Inter**: page titles 24 px / 700, tight tracking; category names 14 px / 600; overlay headings 17 px / 600; body 15 px; table and controls 12 px; problem titles 12 px / 500.
- **JetBrains Mono**: the wordmark (16 px / 600), column headings (11 px / 600 uppercase, wide tracking), dates, counts, `#`, confidence, difficulty letters (11 px / 500), the save-status pill (11 px).

### States

- **Hover:** rows lift to `hover`; nav links and ghost buttons get a faint background; links turn accent; a due chip brightens.
- **Focus:** a 2 px accent outline, 2 px offset, on every focusable control; inputs also take an accent border.
- **Disabled:** 50 % opacity, not-allowed cursor.
- **Pending:** the control shows what is being saved ("Saving…", the value being sent), and the header pill shows `● Saving…`.
- **Motion:** none; overlays and menus appear instantly.

### Status and difficulty

- **Status** (Next column) = a small coloured dot + a 12 px label: `● 3d late` (rose) and `● Today` (amber) in 600, `● Tomorrow` / `● Mon 28 Sep` (blue), `● 3 Oct` (ink-soft), `● Complete` (green).
- **R1–R3:** done is `✓ 18 Aug` in green mono; the next revision is a tinted chip `28 Sep ✓` in its status colour (neutral for later dates), and the whole chip is the button that marks it done; later revisions are a faint `(28 Oct)`.
- **Difficulty** = a tinted mono badge with a border: `E` (green), `M` (amber), `H` (rose). Its shape (a badge) differs from a status dot, so Hard never reads as Overdue.
- **Confidence** = the number 1–3 in a small borderless select (its border and chevron appear on hover or focus); the words Shaky / Okay / Solid appear only in the Solve dialog and the Settings gaps grid (owner decision, 2026-09-25).

### Save status

A small tinted pill in the top-right of every signed-in page: `● Saved` (green), `● Saving…` (amber), `● Couldn't save — retry` (rose), in 11 px mono. The original tracker lost data without showing it; this indicator is how the new app earns trust.

---

## 2. Screens

```
Sign in · Privacy · Terms                       (signed out)
Dashboard · Problems · Notes · Settings          (signed in)
Solve dialog · Edit panel · Note panel · small confirmations   (overlays)
```

**Header on every signed-in page:** sticky at the top, see-through over a blur, with a hairline border underneath. On the left a small indigo square with an "R" and the "RevCode" wordmark in mono; the links **Dashboard · Problems · Notes · Settings** as small 12 px pills (the current one on surface-3 with a border, the others ink-soft); on the right the save-status pill and the user's small round Google photo, which opens a tiny menu: name and email, a **System / Light / Dark** theme switch, and Sign out. On phone, the four links become a bottom bar of four text labels with small icons.

Content width: up to 1720 px, centred, with 32 px side padding (24 px on tablets, 16 px on phones).

---

## 3. Dashboard (`/`)

**Question it answers:** "What do I revise now, and what's coming?"

The layout below was approved by the owner on 2026-09-25 from a clickable mockup (`designs/dashboard_mockup.html`, "With suggestions"). It replaced an earlier version with wrapping chips.

A title row, then three blocks, top to bottom:

**Title row.** "Dashboard" (the page title style) on the left; on the right, the user's today in faint 12 px mono (`Wed 23 Sep 2026`). It explains what "Today" and "Tomorrow" mean, and a wrong time zone shows at once.

**1. Stats strip.** Five tiles joined into one bordered strip (12 px radius, hairlines between them). On phone, Solved spans the full width and the other four form a 2 × 2 grid. Each tile shows a big number (Inter 600, 28 px) and a label in 11 px mono uppercase, faint:

| Solved | Overdue | Due today | Next 7 days | Complete |
|---|---|---|---|---|
| **86** / 250 · label `Solved · 34%` (the `/ 250` smaller and faint) | **2** (rose when > 0) | **1** (amber when > 0) | **4** (blue when > 0; includes tomorrow) | **21** (green when > 0) |

A zero stays in ink-strong.

**2. Lists.** "Revise now" and "Coming up" are two bordered cards, side by side on wide screens (Revise now wider, 3 : 2) and stacked below 1024 px. Each card has a heading bar on surface-head: the name in 11 px mono uppercase (ink-soft) and the item count in faint mono. Items are rows, like the Problems table: about 52 px tall, soft dividers, row hover.

```
REVISE NOW  3                                           COMING UP  4
Permutation in String       M  R1  ● 3d late  📝 [✓ Done]   TOMORROW
Sliding Window                                              Group Anagrams      M  R1  📝 [✓ Done]
Valid Parentheses           E  R2  ● 1d late  📝 [✓ Done]   Arrays & Hashing
Stack                                                       FRI 25 SEP
Majority Element            E  R1  ● Today    + [✓ Done]    Two Sum             E  R2  📝 [✓ Done]
Arrays & Hashing                                            …
```

- **Each row:** the problem title (13 px, 500, links to LeetCode) with its category under it in 11 px faint; the difficulty badge; `R1` / `R2` / `R3` in faint mono; the status label (Revise now only); the Notes button (📝 when a note exists, `+` when not); and a small **✓ Done** button (surface-3 with a `line-strong` border, turning green on hover; not indigo). **✓ Done** opens a tiny popover: a date field set to today, then **Done**.
- **Revise now:** overdue and due-today revisions, most overdue first. Each row keeps its status label (`● 3d late`, `● Today`).
- **Coming up:** tomorrow and the next 7 days, grouped under date rows in 11 px mono uppercase, faint, on surface-head (`Tomorrow`, `Fri 25 Sep`, `Wed 30 Sep`). The rows have no status label, since the date row says it.
- No coloured left border: the status dot and label, or the date row, carry the status.
- **Phone:** each row takes two lines: title and category, then Notes and ✓ Done on the right; below, the badge, `R1` and the status label.
- **Empty:** inside the card, one faint line: "Nothing to revise today — nice." / "Nothing scheduled this week."

A **brand-new user** (nothing solved) sees the stats at zero and one dashed-border line in place of both cards: "Mark a problem solved on the **Problems** page to start your revision schedule."

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

**Table:** one bordered card (12 px radius); column headings in 11 px mono uppercase on surface-head, sticky under the app header; 12 px rows about 44 px tall with soft dividers; row hover in `hover`. Column widths: # 48 · Problem ≥ 240 · Diff 80 · Solved 128 · Conf 64 · R1–R3 112 each · Next 144 · Notes 64 px; #, Diff, Conf and Notes are centred.

```
 #   Problem                     Diff  Solved     Conf  R1        R2        R3        Next            Notes
▾ Arrays & Hashing                                                           5 / 22   ● 1 due
 1   Concatenation of Array      E     ✓ 1 Sep    1     ✓ 2 Sep   ✓ 6 Sep   ✓ 16 Sep  ● Complete      📝
 2   Contains Duplicate          E     ✓ 12 Sep   2     ✓ 15 Sep  ✓ 22 Sep  6 Oct ✓   ● 6 Oct         +
 4   Two Sum                     E     ✓ 16 Sep   2     ✓ 18 Sep  25 Sep ✓  (9 Oct)   ● Fri 25 Sep    📝
 5   Longest Common Prefix       E     ☐          -     -         -         -         -               (+ on hover)
 6   Group Anagrams              M     ✓ 19 Sep   3     24 Sep ✓  (8 Oct)   (7 Nov)   ● Tomorrow      📝
```

- **Categories are collapsible folders**, and there is no pagination. Each category is a header row: a chevron icon and the name (14 px, 600; ink-strong on surface-2 when open, ink on surface when closed) on the left, and on the right a mono `7 / 22` count and a tinted `● N due` pill (overdue + due today, the same items as the dashboard's "Revise now"; coloured by the most urgent) when any are waiting. There are no separate cards or progress bars. Clicking the header opens or closes its problems. While scrolling, the current category's header sticks under the column headings.
  - A first visit shows **all 18 categories collapsed**: a clean overview that fits on one screen:

    ```
    ▸ Arrays & Hashing            5 / 22   ● 1 due
    ▸ Two Pointers                3 / 13
    ▸ Sliding Window              1 / 9    ● 1 due
    ▸ Stack                       4 / 15   ● 1 due
    ▸ Binary Search               0 / 14
    …
    ```
  - The app remembers which categories were left open (in this browser).
  - Searching or filtering opens only the categories with matches and hides the rest; clearing restores the previous open/closed state.
- **#** is faint mono. The **Problem** title is an ink link (weight 500) to LeetCode (accent and underlined on hover), followed by a tiny `Premium` tag on the 7 premium problems.
- **Solved** is a checkbox; once ticked, the date appears beside it in soft mono. Ticking opens the Solve dialog.
- **Conf** is a small select (1 / 2 / 3), editable any time.
- **R1–R3:** `✓ date` (green) when done; the **next** revision is a tinted `28 Sep ✓` chip, which is the button that marks it done; later revisions show a faint `(projected date)`.
- **Next** shows the status dot + label.
- **Notes** shows `+` (faint) or 📝; either opens the Note panel.
- **Unsolved** rows are dimmed (75 %), with a softer title and a faint `-` in each empty cell. Complete rows are not faded (the Stitch design; owner decision, 2026-09-25).
- The `+` for a new note appears on row hover or keyboard focus; the 📝 of an existing note is always shown.
- Clicking a row's empty space opens the **Edit panel** for less common changes.

**Phone:** each row becomes a compact two-line card:

```
4  Two Sum  E                                 📝
✓ 16 Sep · conf 2 · R1 ✓ 18 Sep · ● R2 Fri 25 Sep ✓
```

**Sort "Next due first":** the folders give way to one flat list, most urgent first, with each problem's category in small faint text under its title, except when one category is already chosen (owner decision, 2026-09-25).

**Filters match nothing:** "No problems match." with a Clear link.

---

## 5. Notes (`/notes/[category]`)

**Question it answers:** "What did I write about this topic?"

- **Left column** (220 px): a "Search notes" box, then the 18 categories as a plain list with a faint mono count (`Arrays & Hashing  5`). The current category is in ink with an accent left bar; categories with no notes are faint. At the bottom is a text link, "Download all notes (.md)".
- **Right column:** the category as one readable page (max 720 px wide):
  - A page title, "Arrays & Hashing", with a small "Download .md" link beside it.
  - For each problem with a note: a line with `1. Two Sum` (link) · the `E` badge · a small **Edit** link, then the formatted note underneath and a hairline divider.
  - At the bottom, a faint text link: "Show problems without notes".
- **Formatted note style:** Inter text, Inter 600 for note headings, and code blocks in JetBrains Mono on surface-2 with an 8 px radius.
- **Phone:** the category list becomes a dropdown at the top.
- **Empty category:** "No notes here yet. Add one from the 📝 button on any problem."

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

**Note panel** (slides in from the right, 560 px wide):
- The title at the top, then small **Write | Preview** tabs.
- A single-row toolbar of small icon buttons: B · I · H · list · code · link.
- A plain monospace text area filling the panel.
- A bottom bar with the save status on the left (`Saved 10:42 PM` / `Unsaved changes`), and **Save** plus a faint "Delete" on the right.
- If the note was changed in another tab, a one-line amber banner at the top: "Changed in another tab — Load theirs · Keep mine".

**Confirmations** are one sentence plus two buttons, e.g. "Unmark Two Sum as solved? Your note is kept." [Cancel] [Unmark] (the second in rose).

---

## 8. Sign in, Privacy, Terms

- **Sign in:** centred on the paper background: the wordmark and a small graph logo (like the original tracker's node graph), a one-line description ("Spaced revision for the NeetCode 250, with notes."), a **Continue with Google** button, and faint Privacy · Terms links. Nothing else.
- **Privacy / Terms:** a single reading column of text (max 680 px): a page title, a "Last updated" date, then headings and paragraphs.
- **404:** "Page not found" with a link back to the Dashboard.
