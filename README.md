# Fall Hacks 2026 - Official Interactive Website

An interactive web implementation of the Figma workshop design for **Fall Hacks 2026**, presented by **WiCS** (Women in Computing Science) and hosted by **CSSS** (Computing Science Student Society) at **SFU Burnaby**.

---

## 🎨 Design System & Assets

Crafted from the Figma SVG source files located in `assets/`:
- **`1-home.svg`** & **`6-final-mockup.svg`**: Hero section, expectations trio, schedule preview, sponsors ribbon, CTA banner, and footer.
- **`2-event-schedule.svg`**: Complete 8-session hackathon timetable with tags and category metadata.
- **`3-register-now.svg`**: Student registration form, "What you get" perks, and event logistics sidebar.
- **`4-sponsors.svg`**: Tiered sponsors grid (Gold, Silver, Community Partners), value propositions, and partner contact banner.

### Color Palette
- **Background Cream:** `#FFF1E0`
- **Dark Eggplant / Plum:** `#2A1B2E`
- **Tangerine Orange:** `#F2712B`
- **Honey Gold:** `#F7B93E`
- **Coral Rose:** `#E8A9A3`
- **Soft Sage Green:** `#C9DCC5` & `#A8C5A0`
- **Peach Card:** `#FBE3CB`
- **Light Cream Card:** `#FFF8EF`
- **Border Subtle:** `#F3D9BC`

### Typography
- **Headings:** [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) (Weights: 600, 700, 800)
- **Body & UI:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Weights: 400, 500, 700)
- **Monospace & IDs:** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)

---

## 🚀 Interactive Features

1. **SPA Routing & Multi-Page View Switcher**:
   - Fast, client-side routing between `#home`, `#schedule`, `#sponsors`, and `#register`.
   - Dynamic active indicator line matching Figma orange styling.
   - Browser back/forward history support (`popstate`).
   - Responsive mobile navigation drawer.

2. **Hero Geometric Canvas Playground**:
   - The dark hero banner card features the 4 geometric elements from the Figma mockup:
     - Large Orange Circle (`#F2712B`)
     - Honey Yellow Circle (`#F7B93E`)
     - Coral Rose Capsule Pill (`#E8A9A3`)
     - Sage Green Circle (`#A8C5A0`)
   - Interactive pointer physics: click, drag, and fling shapes with elastic spring return and particle sparkle bursts!

3. **Live Countdown Clock**:
   - Real-time countdown to Saturday, Nov 7, 2026, 9:00 AM PST (SFU Burnaby).

4. **Interactive Schedule Timetable**:
   - Instant live search by title, topic, speaker, room, or track.
   - Category track filters (`All`, `Main Hall`, `Workshops`, `Hacking & Teams`, `Meals & Breaks`, `Judging & Demos`).
   - Expandable session cards revealing room numbers, speaker bios, and prep info.
   - **Session Bookmarking (`★`)**: Favorite sessions with state saved in `localStorage`.
   - **One-Click Calendar Export**: Generates and downloads standard `.ics` (iCalendar) file compatible with Google Calendar, Apple Calendar, and Outlook.

5. **Modern Accessible Registration Form**:
   - Built to Modern Web Guidance standards (`forms`, `validate-input-after-interaction`).
   - Non-intrusive `:user-invalid` feedback that validates on `blur` and clears on `input`.
   - Interactive experience level pill radios (`Beginner`, `Some experience`, `Experienced`).
   - Quick dietary requirement selection chips (`Vegetarian`, `Vegan`, `Halal`, `Gluten-Free`, `Dairy-Free`).
   - School autocomplete suggestions with Metro Vancouver universities & colleges (SFU, UBC, BCIT, UVic, Douglas College, etc.).
   - Full keyboard accessibility and minimum 48px touch targets.

6. **Digital Hacker Badge & Ticket Generator**:
   - Full-screen confetti particle celebration on registration.
   - Generates a customized digital badge ticket with attendee name, school, experience tier, registration ID (`#FH26-XXXX`), and scannable QR code.
   - **PNG Ticket Export**: Generates a downloadable high-resolution 640x920 PNG image badge using HTML5 Canvas.
   - Automatically saves registration in `localStorage` so returning attendees can view their badge anytime.

7. **Sponsor Modals & Partner Inquiry**:
   - Clicking any sponsor card opens a dedicated **Sponsor Detail Modal** with company background, student co-op roles, and hackathon challenges.
   - "Contact us" banner opens the **Sponsorship Inquiry Modal** with tier packages ($3,000 Gold, $1,500 Silver, $500 Community).

8. **SFU Burnaby Campus Guide Modal**:
   - Detailed transit directions (Production Way-University SkyTrain + 145 bus), parking lots, and building rooms (ASB 9705).

9. **Web Audio Synthesizer (Zero External Audio Files)**:
   - Synthesizes click, pop, and success arpeggios using the native Web Audio API.
   - Persistent sound toggle button (`🔔`/`🔕`) in header and `M` key shortcut.

10. **Keyboard Navigation Shortcuts**:
    - `1` : Home
    - `2` : Schedule
    - `3` : Sponsors
    - `4` : Register
    - `M` : Toggle sound
    - `Esc` : Close any open dialog

---

## 💻 How to Run

Simply open `index.html` in any modern web browser, or launch a local web server:

```sh
# Using Node.js
npx serve .

# Or using Python
python -m http.server 8000
```
