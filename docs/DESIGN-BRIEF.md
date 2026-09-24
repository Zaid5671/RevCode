# RevCode — Design Brief

What each screen contains and how it is arranged, for visual design. The behaviour behind each screen is in `PLAN.md` §8; `PLAN.md` wins if the two disagree.

**How to use this with a design AI:** paste §1 first (it sets the look for everything), then one screen at a time. Ask for desktop and phone, light and dark.

---

## 1. Look and feel

**RevCode** is a NeetCode 250 revision tracker: users mark problems solved, rate their confidence, get three spaced revisions per problem, and keep notes. They open it daily to see what to revise.

### The rule: simple, quiet, dense

The design continues the owner's original tracker, which worked because it was **concise**: every piece of information sat where it was needed, and nothing else was on screen.

- **One glance per screen.** Each screen answers one question. Anything that doesn't help answer it is left out.
- **Small text, generous whitespace.** Body text 15 px, table text 13 px, labels 11–12 px. Density comes from compact rows, not from cramming.
- **Colour only means something.** The page is neutral paper and ink; colour appears only for status and difficulty.
- **Numbers and dates in monospace.** Every date, count and status label uses the mono font, so they line up and scan quickly.
- **No decoration.** No gradients, illustrations, large icons, shadows beyond a hairline, or animated flourishes. Hairline borders (1 px) separate things.
- **One primary button per area** at most, in teal.
- Branding: the name is "RevCode". NeetCode's and LeetCode's names, logos and colours are not used as branding; problem titles link to LeetCode.

### Colours (from the original tracker)

| Token | Light | Dark | Used for |
|---|---|---|---|
| bg | `#F7F6F1` | `#14161B` | page background (warm paper) |
| surface | `#FFFFFF` | `#1C1F26` | cards, table, inputs |
| surface-2 | `#EFEDE6` | `#23262F` | table header, hover |
| ink | `#1B1E24` | `#E9E8E3` | main text |
| ink-soft | `#5B5F6A` | `#A3A8B3` | secondary text |
| ink-faint | `#8A8E98` | `#6E7280` | numbers, hints, projected dates |
| line | `#DEDBD0` | `#333640` | borders |
| line-soft | `#EAE7DD` | `#2A2D36` | row dividers |
| teal / teal-bg | `#1F6357` / `#E3F0EA` | `#5FBBA4` / `#17322B` | primary, done, Easy |
| amber / amber-bg | `#A86A1F` / `#FAEDD8` | `#E0AA5C` / `#3B2E18` | due today, Medium |
| rose / rose-bg | `#AC3B2E` / `#F8E2DE` | `#E6897A` / `#3A211D` | overdue, Hard, danger |
| blue | `#33587A` | `#8FB2D6` | tomorrow / next 7 days, focus ring |

Radii: 6 px (buttons, inputs, chips), 10 px (cards, table), 16 px (dialogs).

### Fonts (Google Fonts)

- **Fraunces** (serif, 600) for page titles, section headings and big stat numbers.
- **IBM Plex Sans** for body text and UI.
- **IBM Plex Mono** for dates, counts, status labels and difficulty badges.

### Status and difficulty

- **Status** = a small coloured dot + a mono text label: `● 3d late` (rose), `● Today` (amber), `● Tomorrow` / `● Fri 25 Sep` (blue), `● 8 Oct` (ink-soft), `● Complete` (teal). Projected dates are faint and in brackets: `(9 Oct)`. Done dates: `✓ 18 Sep` in teal.
- **Difficulty** = a small tinted mono badge: `E` (teal on teal-bg), `M` (amber), `H` (rose). Its shape (a filled badge) is different from a status dot, so Hard never reads as Overdue.
- **Confidence** = the number 1–3 in a small select; the words Shaky / Okay / Solid appear only in the Solve dialog.

### Save status

A small dot + mono label in the top-right of every signed-in page: `● Saved` (teal), `● Saving…` (amber), `● Couldn't save — retry` (rose). The original tracker lost data without showing it; this indicator is how the new app earns trust.

---

## 2. Screens

```
Sign in · Privacy · Terms                       (signed out)
Dashboard · Problems · Notes · Settings          (signed in)
Solve dialog · Edit panel · Note panel · small confirmations   (overlays)
```

**Header on every signed-in page:** the "RevCode" wordmark in Fraunces on the left; the links **Dashboard · Problems · Notes · Settings** as plain text (the current one in ink with an underline, the others ink-soft); on the right the save status and the user's small round Google photo, which opens a tiny menu with Sign out. A hairline border underneath. On phone, the four links become a bottom bar of four text labels with small icons.

Content width: up to 1180 px, centred, with 20 px side padding.

---

## 3. Dashboard (`/`)

**Question it answers:** "What do I revise now, and what's coming?"

Three blocks, top to bottom:

**1. Stats strip.** Five tiles joined into one bordered strip (hairlines between them), 2 × 3 on phone. Each tile shows a big Fraunces number and a small label:

| Solved | Overdue | Due today | Next 7 days | Complete |
|---|---|---|---|---|
| **86 / 250** (34%) | **2** (rose when > 0) | **1** (amber when > 0) | **4** (blue; includes tomorrow) | **21** (teal) |

**2. "Revise now"** (a Fraunces heading) holds overdue and due-today revisions, most overdue first, as compact chips that wrap across the width. Each chip:

```
┃ Permutation in String   R1   ● 3d late      📝  ✓
```

- A 3 px left border in the status colour.
- The problem title (links to LeetCode), then `R1` / `R2` / `R3` in faint mono, then the status label.
- Two small icon buttons: 📝 opens the note (filled when a note exists), ✓ marks the revision done. ✓ opens a tiny popover: a date field set to today, then **Done**.
- When there's nothing to revise: one dashed-border line, "Nothing to revise today — nice."

**3. "Coming up"** (a Fraunces heading) holds tomorrow and the next 7 days, in the same chip style, grouped under small mono date labels (`Tomorrow`, `Fri 25 Sep`, `Wed 30 Sep`). If it's empty: "Nothing scheduled this week."

A **brand-new user** sees the stats at zero and one line in place of both lists: "Mark a problem solved on the **Problems** page to start your revision schedule."

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

**Controls row** (one line that wraps on small screens): a search box · **Category** · **Difficulty** · **Status** (All / Unsolved / Overdue / Today / Tomorrow / Next 7 days / Later / Complete / Has notes) · **Sort** (NeetCode order / Next due) · a small "Expand all / Collapse all" text link. The same plain bordered inputs as the original tracker.

**Table:** one bordered card, sticky header in surface-2, 13 px rows with soft dividers, and row hover in surface-2.

```
 #   Problem                     Diff  Solved     Conf  R1        R2        R3        Next            Notes
▾ Arrays & Hashing                                                           5 / 22   ● 1 due
 1   Concatenation of Array      E     ✓ 1 Sep    1     ✓ 2 Sep   ✓ 6 Sep   ✓ 16 Sep  ● Complete      📝
 2   Contains Duplicate          E     ✓ 12 Sep   2     ✓ 15 Sep  ✓ 22 Sep  6 Oct ✓   ● 6 Oct         +
 4   Two Sum                     E     ✓ 16 Sep   2     ✓ 18 Sep  25 Sep ✓  (9 Oct)   ● Fri 25 Sep    📝
 5   Longest Common Prefix       E     ☐          –     –         –         –         –               +
 6   Group Anagrams              M     ✓ 19 Sep   3     24 Sep ✓  (8 Oct)   (7 Nov)   ● Tomorrow      📝
```

- **Categories are collapsible folders**, and there is no pagination. Each category is a header row: a `▸`/`▾` chevron, the name in ink-soft, a `5 / 22` count in mono, and `● N due` (overdue + due today, the same items as the dashboard's "Revise now"; coloured by the most urgent) when any are waiting. There are no separate cards or progress bars. Clicking the header opens or closes its problems.
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
- **#** is faint mono. The **Problem** title is an ink link to LeetCode (teal and underlined on hover), followed by a tiny `Premium` tag on the 7 premium problems.
- **Solved** is a checkbox; once ticked, the date appears beside it in mono. Ticking opens the Solve dialog.
- **Conf** is a small select (1 / 2 / 3), editable any time.
- **R1–R3:** `✓ date` (teal) when done; the **next** revision shows its due date with a small ✓ button to mark it done; later revisions show a faint `(projected date)`.
- **Next** shows the status dot + label.
- **Notes** shows `+` (faint) or 📝; either opens the Note panel.
- **Complete** rows fade slightly, as in the original tracker.
- Clicking a row's empty space opens the **Edit panel** for less common changes.

**Phone:** each row becomes a compact two-line card:

```
4  Two Sum  E                                 📝
✓ 16 Sep · conf 2 · R1 ✓ 18 Sep · ● R2 Fri 25 Sep ✓
```

**Filters match nothing:** "No problems match." with a Clear link.

---

## 5. Notes (`/notes/[category]`)

**Question it answers:** "What did I write about this topic?"

- **Left column** (220 px): a "Search notes" box, then the 18 categories as a plain list with a faint mono count (`Arrays & Hashing  5`). The current category is in ink with a teal left bar; categories with no notes are faint. At the bottom is a text link, "Download all notes (.md)".
- **Right column:** the category as one readable page (max 720 px wide):
  - A Fraunces title, "Arrays & Hashing", with a small "Download .md" link beside it.
  - For each problem with a note: a line with `1. Two Sum` (link) · the `E` badge · a small **Edit** link, then the formatted note underneath and a hairline divider.
  - At the bottom, a faint text link: "Show problems without notes".
- **Formatted note style:** Plex Sans text, Fraunces for note headings, and code blocks in Plex Mono on surface-2 with a 6 px radius.
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

One narrow column (max 640 px) of plain sections, each with a Fraunces heading, a one-line explanation in ink-soft, and its controls. Hairlines between sections.

1. **Revision gaps.** A small 4-column grid like the original tracker's (Confidence | R1 | R2 | R3) with mono number inputs. Rows: 1 Shaky · 1 / 4 / 10, 2 Okay · 3 / 7 / 14, 3 Solid · 5 / 14 / 30. Buttons: **Save** and a text link "Reset to defaults". Explanation line: "Days until each revision. Changing them moves upcoming due dates only."
2. **Time zone.** One select, e.g. "Asia/Kolkata".
3. **Import from old tracker.** "Choose backup file" button. After a file is chosen: a short summary ("7 to import · 2 skipped"), a list of the skipped problems with their reasons in small text, and **Import**.
4. **Export.** An "Export my data (JSON)" button.
5. **Account.** Photo, name and email, and a **Sign out** button.
6. **Delete account.** A rose text button that opens a confirmation where the user types "delete".

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

Clicking a confidence button saves immediately and closes the dialog. The hint line under each button is faint mono.

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
- **Privacy / Terms:** a single reading column of text (max 680 px): a Fraunces title, a "Last updated" date, then headings and paragraphs.
- **404:** "Page not found" with a link back to the Dashboard.
