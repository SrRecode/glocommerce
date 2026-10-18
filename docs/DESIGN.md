# Design System — Glocommerce

Status: **Phase 0 approved — design system locked.**
Owner: derived from PRD section on design tokens/components.
Scope: storefront (`/client`) and admin dashboard share these tokens; admin uses the
denser end of the scale.

---

## 1. Direction

**Editorial Commerce.** Warm paper background, near-black ink, one confident brand
colour, and a serif display face used with restraint. The storefront should read like a
considered print catalogue — generous whitespace, strong type hierarchy, wide product
photography — while the admin stays quiet and utilitarian on the same tokens.

Explicit anti-goals (these are the AI-default look we are avoiding):

- No violet/indigo gradient hero.
- No glassmorphism cards or frosted panels.
- No emoji as icons.
- No three-equal-cards-with-centred-text feature row.
- No default Bootstrap/shadcn look left unmodified.

Personality: calm, premium, trustworthy. Confident type, soft warm neutrals, one accent
used sparingly for emphasis rather than decoration.

---

## 2. Colour

Neutrals carry the layout; brand and accent are used to direct attention.

### Light (default)

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-paper` | `#F6F7F5` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, sheets, table rows |
| `--color-surface-sunken` | `#EFF1EE` | Table headers, inset areas |
| `--color-line` | `#E4E6E3` | Borders, dividers, table rules |
| `--color-ink` | `#111312` | Primary text, headings |
| `--color-graphite` | `#3D4442` | Secondary text |
| `--color-muted` | `#6E7674` | Meta text, captions, placeholders (4.68:1 on white) |
| `--color-brand` | `#12604A` | Primary actions, links, focus (7.6:1 on white) |
| `--color-brand-hover` | `#0E4B3A` | Pressed/hover state |
| `--color-brand-soft` | `#E7F0EC` | Selected rows, brand-tinted chips |
| `--color-accent` | `#C9762F` | Decorative emphasis only — **large text/icons, never body copy** (3.45:1) |
| `--color-accent-text` | `#8A4B14` | Accent used as text (6.78:1 on white) |
| `--color-accent-soft` | `#F7EDE2` | Highlight background |
| `--color-success` | `#1E7F5C` | Delivered, in stock, saved |
| `--color-warning` | `#8A5410` | Low stock, pending (6.2:1) |
| `--color-warning-mark` | `#B4721A` | Warning fills/badges (3.93:1 — non-text only) |
| `--color-danger` | `#B3261E` | Errors, cancel, delete (6.57:1) |
| `--color-info` | `#2563A8` | Neutral notices (6.14:1) |

### Dark

| Token | Hex |
| --- | --- |
| `--color-paper` | `#0D0F0E` |
| `--color-surface` | `#141715` |
| `--color-surface-sunken` | `#1B1F1D` |
| `--color-line` | `#262B28` |
| `--color-ink` | `#F2F4F2` |
| `--color-graphite` | `#C3C9C6` |
| `--color-muted` | `#9AA29E` |
| `--color-brand` | `#2E9E7C` |
| `--color-brand-hover` | `#3DB48F` |
| `--color-brand-soft` | `#17302A` |
| `--color-accent` | `#E0A05A` |
| `--color-accent-text` | `#E0A05A` |
| `--color-danger` | `#E86B62` |
| `--color-success` | `#4CB48D` |
| `--color-warning` | `#DDA45C` |
| `--color-info` | `#7BAEE0` |

Rules:

- Never encode meaning in colour alone — pair every status colour with a label or icon.
- Contrast floors: 4.5:1 body text, 3:1 large text and UI borders/marks.
- Dark mode is part of the token set from the start; it is not a later retrofit.

---

## 3. Typography

Two families. Both from Google Fonts, self-hosted at build time, with system fallbacks.

- **Display / headings:** `Fraunces` — variable optical-size serif. Storefront hero and
  section titles only. Never used in the admin dashboard.
- **UI / body:** `Inter` — everything else, both apps.

Fallback stack: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

### Scale (px / line-height)

| Token | Size | LH | Use |
| --- | --- | --- | --- |
| `display-xl` | 60 | 64 | Storefront hero (Fraunces) |
| `display-lg` | 48 | 52 | Section hero (Fraunces) |
| `h1` | 38 | 44 | Page title |
| `h2` | 30 | 36 | Section title |
| `h3` | 24 | 30 | Card/subsection title |
| `h4` | 20 | 26 | Admin panel title |
| `body-lg` | 18 | 28 | Product description, lead paragraphs |
| `body` | 16 | 26 | Default text |
| `body-sm` | 14 | 22 | Table cells, secondary UI |
| `caption` | 12 | 16 | Meta, labels, timestamps |

Weights: 400 body, 500 UI emphasis/labels, 600 headings and buttons, 700 reserved for
prices and numbers that must dominate.

Rules:

- Tracking: `-0.02em` on display sizes, `-0.01em` on headings, `0` body,
  `+0.08em` uppercase micro-labels.
- Line length: 60–75 characters for prose. Product descriptions cap at `68ch`.
- Numerals: prices and order totals use tabular figures so columns align in the admin.
- Minimum rendered size is 12px; below that use an icon or tooltip instead.

---

## 4. Spacing & Layout

Base unit **4px**. Only these steps are allowed — no arbitrary values.

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

Layout:

- Storefront container: `1200px` max, `24px` gutters (`40px` at `lg+`).
- Admin container: `1440px` max, dense `16px` gutters.
- Grid: 12 columns storefront, 12 columns admin; product grids step
  2 → 3 → 4 columns at `sm` → `md` → `lg`.
- Section rhythm: `64px` vertical on mobile, `96px` at `lg+`.
- Admin table row height `52px`; storefront card padding `16px` (`20px` at `lg+`).

---

## 5. Radius, Borders, Shadows

Radius: `--radius-sm 6px`, `--radius-md 10px`, `--radius-lg 14px`, `--radius-xl 20px`,
`--radius-pill 999px`. Default for cards and inputs: `md`. Buttons: `md`. Badges: `pill`.
Images inside cards: `sm` so the inner radius never fights the card radius.

Borders: `1px solid var(--color-line)` everywhere. Hairline `1px` rules separate table
rows and list items instead of extra card nesting.

Shadows (soft, warm-tinted, never harsh):

| Token | Value |
| --- | --- |
| `shadow-xs` | `0 1px 2px rgba(17,19,18,.06)` |
| `shadow-sm` | `0 1px 3px rgba(17,19,18,.08), 0 1px 2px rgba(17,19,18,.04)` |
| `shadow-md` | `0 4px 12px rgba(17,19,18,.08)` |
| `shadow-lg` | `0 12px 32px rgba(17,19,18,.10)` |

Elevation policy: cards are flat with a `1px` border — **no shadow**. Shadows are
reserved for things that float above the page: dropdowns, modals, drawers, toasts.

---

## 6. Motion

- Durations: `120ms` micro (hover, focus), `200ms` standard (dropdown, tab), `300ms`
  large (modal, drawer).
- Easing: `cubic-bezier(.2,.8,.2,1)` (ease-out) for entrances;
  `cubic-bezier(.4,0,1,1)` for exits.
- Animate `opacity` and `transform` only — never `width`/`height`/`top`/`left`.
- Page transitions: none. Content appears; it does not slide in.
- `prefers-reduced-motion: reduce` removes all non-essential motion and shortens the
  rest to `0ms`.

---

## 7. Iconography

Lucide React. Stroke `1.5`, sizes `16 / 20 / 24`. Colour inherits from text. Icons
always accompany a label except in the admin toolbar, where each icon button carries an
`aria-label` and a tooltip.

---

## 8. Component Specifications

Built on shadcn/ui primitives, restyled to these tokens.

**Button** — variants `primary` (brand fill, white text), `secondary` (surface fill, line
border), `ghost` (transparent, hover tint), `danger` (danger fill), `link`. Sizes
`sm 32px / md 40px / lg 48px`. Min touch target `44px` on mobile. Focus: `2px` brand ring
with `2px` offset. Loading state replaces the label with a spinner and locks width.

**Input / Select / Textarea** — `40px` tall, `md` radius, `1px` line border, `brand`
border + ring on focus. Errors render a `danger` border plus a `12px` message below,
never a toast. Every field has a real `<label>`; placeholders are never the label.

**ProductCard** — image (`4:5`), name (`h4`), price (`700`, tabular), optional stock
badge. Whole card is a link; the quick-add button is a separate focusable control and
stops propagation.

**StatusBadge** — one per order status with a fixed colour and label:
`pending` warning, `confirmed` info, `shipped` accent, `delivered` success,
`cancelled` danger. Always shows text, never colour alone.

**Table (admin)** — sticky header on `surface-sunken`, `52px` rows, `1px` row rules,
numeric columns right-aligned and tabular. Row actions in a trailing `40px` slot that
never shifts column widths.

**Modal / Drawer** — `lg` shadow, `xl` radius, focus trapped, `Esc` closes, background
scroll locked. Drawer for admin filters; modal for destructive confirms only.

**Toast** — bottom-right, `300ms` in, auto-dismiss `5s`, `success`/`danger`/`info`
variants with an icon and a single action slot.

**Empty / Skeleton states** — every collection has both: an `—` empty state with one
sentence and one action, and a skeleton that mirrors the final layout (no spinners for
first paint of lists).

---

## 9. Accessibility

Target **WCAG 2.2 AA**.

- Contrast per section 2; every interactive element has a visible focus indicator.
- Semantic landmarks (`header`/`nav`/`main`/`aside`/`footer`), one `h1` per page.
- Keyboard reachable end to end; skip-link to main content; logical tab order.
- Form errors associated via `aria-describedby` and announced in a live region.
- Cart and order-status changes announced politely, not assertively.
- Images: real `alt` for product photos (product name), empty `alt` for decoration.
- Tested at `200%` zoom and at `320px` width without horizontal scroll.

---

## 10. Tailwind Token Mapping

Tokens are defined once as CSS custom properties in `:root` / `.dark`, then referenced by
Tailwind's theme so utilities never carry raw hex:

```css
:root {
  --color-brand: #12604A;
  --radius-md: 10px;
  /* ...see section 2 */
}
```

```js
// tailwind.config — illustrative
theme: {
  extend: {
    colors: {
      paper: 'var(--color-paper)',
      surface: 'var(--color-surface)',
      line: 'var(--color-line)',
      ink: 'var(--color-ink)',
      brand: { DEFAULT: 'var(--color-brand)', hover: 'var(--color-brand-hover)' },
    },
    borderRadius: { md: 'var(--radius-md)' },
    fontFamily: { display: ['Fraunces', 'serif'], sans: ['Inter', 'sans-serif'] },
  },
}
```

Rule: components use token utilities (`bg-brand`, `text-muted`), never `bg-[#12604A]`.
A raw hex in a component is a review failure.

---

## 11. References & Inspiration

Sources reviewed while writing this system. **Reference only** — components below are
not vendored; we re-implement them on our own tokens so the two apps keep one design
language.

### Pinterest — structural cues

Pinterest's own design analysis (Fudge teardown, Mobbin screens, Betasaurus masonry
notes) produced four cues we adopted:

| Cue | Adopted as |
| --- | --- |
| Content-forward, chrome recedes | Product photography is flush and borderless inside cards; no decorative frames |
| Disciplined rounding scale, soft pill corners | Our radius scale (§5): `md` cards/buttons, `pill` for badges, chips, search |
| Persistent left nav rail on desktop, collapses on narrow | Admin shell (§8 Table): fixed `240px` rail at `lg+`, sheet/bar below |
| Colour reserved for state and one action accent | Brand green for actions only; status colours never the sole signal (§2) |

**Complete-the-look rail** (Pinterest's bundling pattern) is adopted for the product
detail page: a horizontal, edge-to-edge scroll of complementary products.

**Rejected from Pinterest:** true-black canvas (we are warm paper, light-first) and
masonry for the main product grid — variable card heights make prices hard to scan in a
purchase context. Masonry is used **only** for editorial collections ("Shop the edit")
and category tiles, where the goal is discovery rather than comparison.

### Admin patterns — AdminLTE 2026 taxonomy

Of the five dashboard archetypes, ours is **classic sidebar** (deep CRUD navigation)
with a **table-first** primary surface for orders. Consequences:

- The orders table *is* the interface: sticky header, `52px` rows, hairline rules,
  right-aligned tabular numerals, status as a chip.
- **One verdict per screen** — the single number the user came for gets the top-left slot
  and the largest type; everything else supports it.
- Hierarchy comes from type and space, not boxes. No nested cards.
- Numerals are the real typography decision: tabular figures, units set lighter than the
  value.
- Cap top-level admin nav and above-the-fold KPI tiles at five to seven items.
- Design the empty and pending states as first-class surfaces.
- Keyboard is not optional: visible focus, logical tab order, arrow-navigable tables.

### 21st.dev — component references

| Reference | id | Used for |
| --- | --- | --- |
| Product Card — deltacomponents | 28200 | `ProductCard` anatomy: `4:5` image, quiet meta row, price emphasis |
| Product Listing Card — shadcnstore | 28227 | Grid card internals, badge placement |
| Shop by Category Grid — ziegfiroyt | 29288 | Category tiles (masonry treatment) |
| Featured Product Showcase — ziegfiroyt | ecommerce5 | Home hero merchandising band |
| ProductCard — youcefbnm | 1635 | Quick-add button as a separate focusable control |
| App Dashboard Layout — shadcnstore | 28770 | Admin shell: sidebar + KPI cards |
| Commerce Dashboard — efferd | 28923 | Admin overview: revenue trend, category share, shortcuts |
| Dashboard Overview — uniquesonu | 8371 | KPI card rhythm |
| Stocks Dashboard — moumensoliman | 29424 | Sortable dense table + row detail modal |
| Advanced Stats — uilayout.contact | 19070 | Stat + trend treatment |
| Commerce Hero — bankkroll | 4927 | Storefront hero/navbar structure |
| Navbar Section 2 — solaceui | 18120 | Mega-menu / expanding nav behaviour |

Take from these: **anatomy and density**, not their palettes, radii, or copy. Where a
reference conflicts with §2–§7, our tokens win.

### Resulting deltas to this system

1. Storefront header search is a **pill** input (§5 `radius-pill`), not a rectangle.
2. KPI/metric cards get an explicit anatomy: label (`caption`, muted) → value (`h2`,
   `700`, tabular) → change indicator (arrow **and** colour **and** sign).
3. Admin nav is a persistent rail with icon-over-label items, active state in `ink`.
4. Editorial collections use masonry; the shopping grid does not.
5. PDP gains the complete-the-look rail.

---

## Resolved decisions

1. **Brand colour** — deep emerald `#12604A`. Confirmed.
2. **Display face** — `Fraunces`. Confirmed, storefront only.
3. **Dark mode** — tokens are part of the system now (not retrofitted); light remains the
   default and dark UI is wired in Phases 5–6 rather than deferred indefinitely.

Status: **approved.** Phase 0 complete.
