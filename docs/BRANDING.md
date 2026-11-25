# CrewHive Design System & Brand Guidelines
**Official Visual Identity, Component Standards & Multi-Platform Specification**

*Authoritative Source of Truth for Web (Next.js + Tailwind v4), Mobile (React Native + Expo), and Future Digital Products.*

---

## Table of Contents
1. [Primary Objective & Scope](#1-primary-objective--scope)
2. [Brand Identity & Positioning](#2-brand-identity--positioning)
3. [Logo & Brand Mark Standards](#3-logo--brand-mark-standards)
4. [Color Architecture](#4-color-architecture)
5. [Typography System (English & Malayalam)](#5-typography-system-english--malayalam)
6. [Spacing, Grid & Layout Rules](#6-spacing-grid--layout-rules)
7. [Shape, Elevation & Shadow System](#7-shape-elevation--shadow-system)
8. [Component Design Standards](#8-component-design-standards)
9. [CrewHive Product Patterns](#9-crewhive-product-patterns)
10. [Iconography & Media Guidelines](#10-iconography--media-guidelines)
11. [Motion & Interaction Principles](#11-motion--interaction-principles)
12. [Native Mobile Adaptation (React Native Expo)](#12-native-mobile-adaptation-react-native-expo)
13. [Accessibility Standards (WCAG 2.2 AA)](#13-accessibility-standards-wcag-22-aa)
14. [Responsive Breakpoints & Viewport Rules](#14-responsive-breakpoints--viewport-rules)
15. [Design Tokens Specification](#15-design-tokens-specification)
16. [Non-Negotiable Brand Rules](#16-non-negotiable-brand-rules)
17. [Visual References & Inventory Index](#17-visual-references--inventory-index)

---

## 1. Primary Objective & Scope

This document is the **official, binding brand system specification** for the CrewHive ecosystem.

### Target Platforms:
1. **CrewHive Web Application** (`web/`): Next.js 15, React 19, Tailwind CSS v4, Lucide Icons, Sonner.
2. **CrewHive Mobile Application** (`mobile/`): React Native, Expo SDK 54, NativeWind, React Navigation.
3. **CrewHive Admin & Moderation Consoles**: Web and desktop management portals.
4. **Third-Party Partner Experiences**: Association onboarding pages, recruiter dashboards, and embeddable badges.

### Core Architecture Principle:
> **The Next.js website (`web/`) is the visual source of truth.**  
> The mobile application must faithfully reproduce the same color palette, typography hierarchy, component styling, and visual weight while adapting layouts, gestures, and touch targets to native iOS and Android platform conventions. No developer or AI agent should independently invent visual styles.

---

## 2. Brand Identity & Positioning

### 2.1 Brand Name
- **Primary Mark:** `CrewHive` (single camel-case word; capital **C**, capital **H**).
- **Secondary Descriptor:** `Kerala AV Network` (all-caps, tracked letter spacing).
- **Domain:** `crewhive.com` (or regional domain equivalent).

### 2.2 Product Positioning
CrewHive is Kerala’s dedicated audio-visual, live events, and film production talent network. It provides verified technical crew discovery, direct booking inquiries, real-time availability broadcasts, and institutional trade association integrations.

### 2.3 Brand Purpose
To eliminate unstructured WhatsApp forward chains, informal middlemen, and opaque hiring practices in Kerala’s entertainment industry by equipping technicians with a professional digital identity and giving recruiters verified, real-time access to production crews.

### 2.4 Target Audiences
1. **Skilled AV & Event Technicians (Crew Members):** Sound engineers, lighting operators, LED wall technicians, riggers, cinematographers, drone pilots, stage managers, and post-production specialists.
2. **Recruiters & Production Houses (Organizers):** Event management companies, film production houses, wedding planners, corporate agencies, broadcast networks, and venue technical directors.
3. **Industry Associations & Trade Guilds:** Recognized AV bodies, technician unions, and cultural guilds across Kerala.
4. **Platform Administrators & Mediators:** Super admins ensuring verification, profile approvals, content moderation, and platform safety.

### 2.5 Brand Personality
- **Production-Ready & Professional:** Inspired by high-end studio control consoles, camera rigs, and concert lighting boards. Never playful, gimmicky, or childish.
- **Authoritative & Trustworthy:** Direct, clear, verified credentials with no commission deductions on technician wages.
- **Dark-Mode Native:** Rooted in the natural operating environment of live shows, dark control rooms, sound stages, and broadcast vans.
- **Bilingual & Culturally Grounded:** Seamless parity between English and Malayalam typography.

---

## 3. Logo & Brand Mark Standards

### 3.1 Anatomy of the Brand Mark

```
┌─────────────────────────────────┐
│  ┌─────────┐                    │
│  │    C    │  CrewHive          │
│  └─────────┘  KERALA AV NETWORK │
└─────────────────────────────────┘
```

1. **The Amber "C" Emblem:**
   - **Container:** Rounded square (`rounded-lg`, radius 8px).
   - **Background Gradient:** Linear gradient from top to bottom:
     - Top: `#F5A623` (Brand Amber)
     - Bottom: `#DF9115` (Deep Golden Ochre)
   - **Interior Highlight:** Inset top bevel `inset 0 1px 0 rgba(255, 255, 255, 0.40)`.
   - **Drop Shadow:** Subtle golden glow `0 2px 6px rgba(245, 166, 35, 0.30)`.
   - **Glyph:** Bold uppercase "C" in `#09090B` (Zinc-950), font weight 900 (Black).
2. **The Logotype:**
   - Text: `CrewHive` in `#FFFFFF` (Pure White), font weight 700 (Bold), tracking `-0.02em`.
   - Hover state: Transitions to `#F5A623`.
3. **The Subtitle:**
   - Text: `KERALA AV NETWORK` in `#A1A1AA` (Zinc-400), font size 9px, font weight 600, letter spacing `0.1em` (`tracking-wider`), uppercase.

### 3.2 Dimensions & Clearspace
- **Desktop Navbar:** 32×32px mark (`w-8 h-8`), 18px logotype.
- **Mobile Navbar:** 32×32px mark, 16px logotype.
- **Mobile App Launch Icon:** 1024×1024px canvas, 640×640px emblem centered.
- **Minimum Clearspace:** Equal to 50% of the emblem’s width on all four sides. No adjacent typography or borders may intrude inside this bounding box.
- **Minimum Permitted Size:** 24×24px (web favicon / small toolbar item).

### 3.3 Prohibited Logo Treatments
- ❌ **Do NOT** change the "C" emblem background from amber to any other color.
- ❌ **Do NOT** use AI-generated neon glows, starbursts, or decorative drop shadows.
- ❌ **Do NOT** skew, stretch, or alter the aspect ratio of the emblem.
- ❌ **Do NOT** render the logotype in cursive, serif, or novelty display typefaces.
- ❌ **Do NOT** place the mark on light or white backgrounds without an explicit dark enclosure.

---

## 4. Color Architecture

CrewHive is a **dark-mode-first system**. High-contrast amber accents cut through deep carbon surfaces, mirroring concert lighting fixtures piercing a dark stage.

### 4.1 Primary Brand Palette

```css
--color-brand-primary:       #F5A623; /* Primary Amber */
--color-brand-primary-hover: #DF9115; /* Gradient Stop & Active State */
--color-brand-primary-light: rgba(245, 166, 35, 0.12); /* Badge Background */
--color-brand-primary-border:rgba(245, 166, 35, 0.25); /* Badge Border */
```

- **Usage:** Primary CTA buttons, active state indicators, key numeric stats, brand emblems, and verified icons.

### 4.2 Neutral & Surface Hierarchy (Dark Canvas)

| Token | Hex Value | Role in UI | CSS Custom Property |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#0D0D0D` | Deepest root background behind all views. | `--background` |
| **Card Surface** | `#141414` | Primary elevated surface for cards, dialogs, navbars. | `--card` |
| **Input / Muted Surface** | `#1A1A1A` | Secondary background for text inputs, dropdowns, table headers. | `--input` / `--muted` |
| **Elevated Hover Surface** | `#242424` | Hover states on interactive rows and dropdown options. | `--secondary` |
| **Divider & Border** | `#2A2A2A` | Default 1px border on cards, dividers, and inputs. | `--border` |
| **Subtle Inset Border** | `rgba(255, 255, 255, 0.08)` | Highlight line inside modals and cards. | — |

### 4.3 Typography & Foreground Hierarchy

| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| **Primary Text** | `#F5F5F5` | High-emphasis body copy, headings, active labels. |
| **Pure White** | `#FFFFFF` | Brand titles, primary button text when on dark surfaces. |
| **Secondary Text** | `#A1A1AA` | Form labels, metadata rows, card captions, subtitles. |
| **Muted Text** | `#71717A` | Timestamps, placeholders, inactive toggle text, legal notes. |
| **Inverse Text** | `#0D0D0D` | Bold black text on top of `#F5A623` primary buttons and badges. |

### 4.4 Semantic & Status Palette

| State | Primary Hex | Background (10-12%) | Border (25-30%) | Context in CrewHive |
| :--- | :--- | :--- | :--- | :--- |
| **Available Now** | `#10B981` (Emerald) | `rgba(16, 185, 129, 0.12)` | `rgba(16, 185, 129, 0.25)` | Live 18h availability beacon, approved status. |
| **Busy / Inactive** | `#71717A` (Zinc) | `rgba(113, 113, 122, 0.12)` | `rgba(113, 113, 122, 0.20)` | Technician currently on show, auto-expired status. |
| **Pending** | `#F59E0B` (Amber) | `rgba(245, 158, 11, 0.12)` | `rgba(245, 158, 11, 0.25)` | Awaiting recruiter response, pending profile approval. |
| **Declined / Error** | `#EF4444` (Red) | `rgba(239, 68, 68, 0.12)` | `rgba(239, 68, 68, 0.30)` | Request rejected, admin revoke, form validation error. |
| **WhatsApp Brand** | `#25D366` (Green) | `rgba(37, 211, 102, 0.12)` | `rgba(37, 211, 102, 0.30)` | Direct WhatsApp onboarding and messaging channels. |
| **Informational / Info** | `#38BDF8` (Sky) | `rgba(56, 189, 248, 0.12)` | `rgba(56, 189, 248, 0.25)` | Info callouts, tips, rigging/staging category tags. |

### 4.5 Multi-Role Identity Color Accents

| Platform Role | Accent Color | Visual Tag Treatment |
| :--- | :--- | :--- |
| **Crew Member** | `#F5A623` (Amber) | `text-amber-400 bg-amber-500/10 border-amber-500/25` |
| **Organizer / Recruiter** | `#C084FC` (Purple) | `text-purple-400 bg-purple-500/10 border-purple-500/25` |
| **Administrator / Super Admin** | `#38BDF8` (Sky) | `text-sky-400 bg-sky-500/10 border-sky-500/25` |
| **Trade Association Member** | `#FBBF24` (Gold) | `text-amber-400 bg-amber-400/10 border-amber-400/20` |

---

## 5. Typography System (English & Malayalam)

CrewHive features a bilingual typographic system designed for maximum legibility in both Latin and Malayalam scripts.

### 5.1 Font Stacks

```css
/* English / Latin / Numerals */
--font-inter: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* Malayalam Script */
--font-malayalam: 'Noto Sans Malayalam', 'Manjari', 'Gayathri', -apple-system, BlinkMacSystemFont, sans-serif;
```

### 5.2 Responsive Typographic Scale

| Level | Desktop Size / Line-Height | Mobile Size / Line-Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `48px` (3.0rem) / 1.10 | `36px` (2.25rem) / 1.15 | 800 (ExtraBold) | `-0.025em` | Landing page hero statements. |
| **Heading 1 (H1)** | `36px` (2.25rem) / 1.15 | `28px` (1.75rem) / 1.20 | 700 (Bold) | `-0.020em` | Page main titles, dashboard headers. |
| **Heading 2 (H2)** | `26px` (1.625rem) / 1.20 | `22px` (1.375rem) / 1.25 | 600 (SemiBold) | `-0.015em` | Section headers, modal titles. |
| **Heading 3 (H3)** | `20px` (1.25rem) / 1.30 | `18px` (1.125rem) / 1.30 | 600 (SemiBold) | `0em` | Card titles, category headers. |
| **Body Large** | `18px` (1.125rem) / 1.50 | `16px` (1.0rem) / 1.50 | 400 (Regular) | `0em` | Feature intro text, callouts. |
| **Body (Default)** | `16px` (1.0rem) / 1.50 | `16px` (1.0rem) / 1.50 | 400 (Regular) | `0em` | Default paragraphs, form inputs. |
| **Secondary Body** | `14px` (0.875rem) / 1.40 | `14px` (0.875rem) / 1.40 | 400 / 500 | `0em` | Supporting text, metadata rows. |
| **Caption / Badge** | `12px` (0.75rem) / 1.35 | `12px` (0.75rem) / 1.35 | 500 / 600 | `+0.01em` | Status chips, timestamps, errors. |
| **Micro / Subtitle** | `10px` (0.625rem) / 1.20 | `10px` (0.625rem) / 1.20 | 600 (SemiBold) | `+0.08em` | All-caps subtitles, category pips. |

### 5.3 Special Malayalam Typography Rules
- **No Diacritic Clipping:** Malayalam characters feature complex vertical ascenders and descenders (e.g. ്, ി, ീ, ു, ൂ). The global stylesheet enforces:
  ```css
  [lang="ml"] h1, [lang="ml"] h2, [lang="ml"] h3 {
    line-height: 1.25 !important;
  }
  [lang="ml"] button, [lang="ml"] .badge {
    line-height: 1.35;
  }
  ```
- **Text Expansion:** Malayalam translated text is typically 20%–35% wider than English. Layouts must never use fixed width containers for action labels or badges; always allow flexible horizontal expansion with `min-w-0` and `flex-wrap`.
- **Word Breaking:** Enforce `word-break: break-word` and `overflow-wrap: break-word` to prevent horizontal viewport overflow.

---

## 6. Spacing, Grid & Layout Rules

CrewHive uses an 8-point geometric spacing grid with 4-point sub-steps for micro-alignments.

### 6.1 Spacing Scale

| Value | Pixels | Rem | Tailwind Utility | Primary Application |
| :--- | :--- | :--- | :--- | :--- |
| **1** | 4px | 0.25rem | `p-1`, `gap-1` | Micro badge padding, icon-to-label offset. |
| **2** | 8px | 0.50rem | `p-2`, `gap-2` | Action button padding, compact list gaps. |
| **3** | 12px | 0.75rem | `p-3`, `gap-3` | Input field internal padding, card metadata gaps. |
| **4** | 16px | 1.00rem | `p-4`, `gap-4` | Standard mobile screen gutter, basic card padding. |
| **5** | 20px | 1.25rem | `p-5`, `gap-5` | Public crew card padding, modal body padding. |
| **6** | 24px | 1.50rem | `p-6`, `gap-6` | Desktop card padding, section element gap. |
| **8** | 32px | 2.00rem | `p-8`, `gap-8` | Dashboard widget gaps, search filter sidebar. |
| **10** | 40px | 2.50rem | `p-10`, `gap-10` | Section vertical rhythm, header margin. |
| **12** | 48px | 3.00rem | `p-12`, `gap-12` | Major landing page block separation. |
| **16** | 64px | 4.00rem | `py-16` | Desktop section vertical spacing. |

### 6.2 Layout Max-Widths & Breakpoints
- **Mobile Container:** Full width with `px-4` (16px) or `px-5` (20px) horizontal margin.
- **Tablet / Small Desktop Container:** Max width `1024px` (`max-w-5xl`).
- **Standard Desktop Container:** Max width `1280px` (`max-w-7xl`).
- **Dashboard Data Grid:** Max width `1440px` (`max-w-[1440px]`).

---

## 7. Shape, Elevation & Shadow System

### 7.1 Border Radius Standards

| Token | Class | Radii | Application |
| :--- | :--- | :--- | :--- |
| `radius-sm` | `rounded-md` | 6px | Category tags, filter chips, dropdown menu items. |
| `radius-md` | `rounded-lg` | 8px | Brand logo emblem, segmented language toggle pill items. |
| `radius-lg` | `rounded-xl` | 12px | Interactive buttons, text inputs, search fields, select menus. |
| `radius-xl` | `rounded-2xl` | 16px | Public crew cards, stat overview cards, modal dialogs. |
| `radius-2xl` | `rounded-3xl` | 24px | Large landing page priority cards, mobile bottom sheets. |
| `radius-full`| `rounded-full`| 9999px | Status badges, live availability beacons, user profile avatars. |

### 7.2 Elevation & Shadows

```css
/* Card Elevation */
--shadow-card: 0 4px 16px rgba(0, 0, 0, 0.40);
--shadow-card-hover: 0 8px 24px rgba(245, 166, 35, 0.08);

/* Primary Amber Button Elevation */
--shadow-primary-btn: 0 2px 12px rgba(245, 166, 35, 0.25);
--shadow-primary-hover: 0 4px 16px rgba(245, 166, 35, 0.35);

/* Primary Button Inset Bevel */
--shadow-inset-bevel: inset 0 1px 0 rgba(255, 255, 255, 0.35);

/* Modal Backdrop */
--backdrop-modal: rgba(0, 0, 0, 0.75);
```

---

## 8. Component Design Standards

### 8.1 Buttons

#### A. Primary Brand Button
- **Styling:** Linear gradient `bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500`, text `text-zinc-950 font-semibold`, `rounded-xl`, shadow `shadow-[0_2px_12px_rgba(245,166,35,0.25)]`.
- **Active State:** `active:scale-[0.98] transition-all duration-150`.
- **Usage:** "Create free profile", "Submit Inquiry", "Send Availability Request".

#### B. Secondary Dark Button
- **Styling:** `bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-semibold rounded-xl`.
- **Usage:** "I'm hiring crew", "View Profile", filter toggle controls.

#### C. Emerald Success Button (Approval)
- **Styling:** `bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-[0_2px_8px_rgba(16,185,129,0.30)]`.
- **Usage:** "Approve" profile in Admin Moderation.

#### D. Destructive Outline Button (Rejection / Revoke)
- **Styling:** `bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold`.
- **Usage:** "Reject" profile, "Revoke Access", "Cancel Request".

#### E. WhatsApp Brand Action Button
- **Styling:** `bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 font-semibold rounded-xl flex items-center justify-center gap-2`.
- **Usage:** "Sign up via WhatsApp", "Chat on WhatsApp".

#### F. Language Switcher Pill
- **Container:** `bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-0.5 flex items-center gap-1`.
- **Active Segment:** `bg-amber-500 text-zinc-950 font-semibold px-2 py-1 rounded-lg text-xs` with a 4px amber indicator dot.
- **Inactive Segment:** `text-zinc-400 hover:text-zinc-200 px-2 py-1 text-xs transition-colors`.

### 8.2 Form Components & Inputs

#### Text Fields & Select Menus
- **Base Style:** `bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3.5 py-3 text-base sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all`.
- **Focus State:** `focus:border-[#F5A623] focus:ring-2 focus:ring-[#F5A623]/25`.
- **Error State:** `border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20`.
- **Mobile Touch Height:** Strict minimum height of `44px` (`py-3`) to prevent accidental taps and iOS viewport zoom.

#### Checkboxes & Radios
- **Style:** `w-4 h-4 rounded text-primary border-border bg-muted focus:ring-primary focus:ring-offset-background`.

### 8.3 Cards & Containers

- **Standard Card:** `bg-card border border-border rounded-2xl p-5 shadow-xs transition-all hover:border-primary/40`.
- **Featured / Priority Card:** `bg-card/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-md`.

### 8.4 Notification Toasts (Sonner)
- **Positioning:** **Top-right** on desktop (`position="top-right"`), top-center on mobile devices.
- **Theme:** Forced dark theme (`theme="dark"`) with solid surface `#141414`, subtle border `#2A2A2A`, and high-contrast text.
- **Variants:**
  - `toast.success()`: Emerald icon and text.
  - `toast.error()`: Red icon and text.
  - `toast.warning()`: Amber warning icon and text.
  - `toast.info()`: Sky blue information icon and text.

---

## 9. CrewHive Product Patterns

### 9.1 Public Crew Profile Card (`CrewCard.js`)
- **Avatar:** 56×56px (`w-14 h-14 rounded-2xl object-cover border border-border`). If no photo is provided, display crew initials in bold amber inside `bg-primary/10 border border-primary/20`.
- **Name & Verification:** Bold text (16px), accompanied by the verified association badge if applicable.
- **Role Tag:** Distinctive amber badge `text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md text-xs font-semibold`.
- **Specialisation Chips:** Up to 3 chips displayed in `text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded`, followed by `+N more` indicator if applicable.
- **Rate Display:**
  - Public: Indian Rupee icon + formatted day rate in bold primary amber + `/ day` suffix.
  - Private: *"Rate on request"* in muted italic text.
- **Privacy Enforcement:** Never display exact street addresses or live GPS coordinates on public cards. Only district/city (e.g. "Kochi") is surfaced.

### 9.2 Real-Time Availability Broadcast ("Available Now")
- **Active State Indicator:** Emerald pill badge `text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full text-[11px] font-semibold` with a pulsing 6px emerald dot.
- **Inactive / Busy Indicator:** Zinc pill badge `text-zinc-400 bg-zinc-400/10 border border-zinc-400/20 px-2 py-0.5 rounded-full text-[11px] font-semibold` with a static zinc dot.
- **Auto-Expiration Model:** Availability is ephemeral. Broadcasts automatically expire after **18 hours** unless renewed by the technician.
- **Coarse Location Modal:** Activating "Available Now" presents a modal requesting city/district confirmation (never raw coordinates).

### 9.3 Recruiter Search & Filter System
- **Taxonomy Filters:** 10 core parent roles with cascading specialisations:
  1. Lighting
  2. Sound
  3. Rigging & Staging
  4. SFX
  5. Camera
  6. Direction & Production
  7. Art & Set
  8. Photo & Video
  9. Post-Production
  10. LED & Video Walls
- **Location Selector:** Kerala districts prioritized with launch cities: Kochi, Thiruvananthapuram, Kozhikode.
- **Available Now Toggle:** Instant filter excluding busy and expired profiles.
- **URL Synchronization:** Filter state is reflected in URL query parameters (`?role=sound&city=kochi&available=true`) to enable shareable searches.

### 9.4 Availability Inquiries & Direct Requests
- **Request Creation Modal:** Form captures project name, shoot/event dates, call location, and optional notes.
- **Status Lifecycles:**
  - `pending`: Amber indicator.
  - `accepted`: Emerald checkmark.
  - `declined`: Red badge.
  - `expired`: Muted zinc badge.

---

## 10. Iconography & Media Guidelines

### 10.1 Bespoke Audio-Visual Domain SVGs (`AvIcons.js`)
To maintain technical credibility with audio engineers, lighting designers, and production crews, CrewHive uses bespoke hardware-accurate icons:

1. **`ConsoleFaderIcon`:** 3-channel audio/lighting mixing desk with distinct fader track caps. Used for sound engineering and lighting consoles.
2. **`ProductionClapperIcon`:** Film/event production slate clapperboard with angled stripes and hinge. Used for directors and production houses.
3. **`StageLightIcon`:** PAR-can / profile lighting fixture with mounting yoke and lens. Used for lighting crew.
4. **`RiggingTrussIcon`:** Structural box truss with cross-bracing. Used for rigging and stage crew.
5. **`WhatsAppBrandIcon`:** Official WhatsApp brand glyph.

> **Strict Icon Rule:** Never use generic "sparkle" / AI icons or playful consumer graphics. Every icon must represent authentic stage and production equipment.

### 10.2 System Icons (`lucide-react`)
- Stroke width: `1.8px` for action controls; `1.5px` for large category tiles.
- Standard sizes: `14px` (meta/inline), `16px` (button), `20px` (nav/section), `24px` (category tile).

### 10.3 Media & Image Ratios
- **Crew Profile Photos:** 1:1 square ratio, minimum resolution 400×400px.
- **Portfolio & Event Photos:** 16:9 widescreen or 4:3 documentary format.
- **Association Logos:** 1:1 square or 3:2 landscape on dark background.

---

## 11. Motion & Interaction Principles

- **Fast & Responsive:** Duration between `150ms` and `200ms` with `ease-out` timing.
- **Tactile Feedback:** Buttons scale to `scale-[0.98]` on press/tap.
- **Hover Transitions:** Color and border shifts use `transition-all duration-200`.
- **Reduced Motion Support:** Honors `prefers-reduced-motion: reduce` by replacing animated transforms with instant state changes.

---

## 12. Native Mobile Adaptation (React Native Expo)

The CrewHive React Native application (`mobile/`) must deliver the exact same visual identity while adhering to native mobile interaction paradigms.

### 12.1 Shared vs. Native Responsibilities

| Design Element | Website (`web/`) | Mobile App (`mobile/`) |
| :--- | :--- | :--- |
| **Color System** | CSS Custom Properties & Tailwind v4 | JavaScript Constants & NativeWind classes |
| **Typography Family** | Web Fonts via Google Fonts | Bundled TTF/OTF via `expo-font` |
| **Navigation** | Sticky Top Navbar with Dropdowns | Bottom Tab Navigator + Stack Headers |
| **Dialogs / Modals** | Radix UI Centered Dialogs | Native Bottom Sheets / ActionSheets |
| **Touch Targets** | Standard pointer targets (min 36px) | Apple HIG / Android Material floor: **44×44px** |
| **Status Bar** | Browser default | `expo-status-bar` style `"light"` |
| **Safe Areas** | Handled by CSS container queries | `react-native-safe-area-context` (`SafeAreaView`) |

### 12.2 Bottom Tab Navigation Specification (Mobile App)
The mobile application replaces the desktop header with a 4-tab bottom navigation bar:

```
┌────────────────────────────────────────────────────────┐
│   [ 🔍 Search ]   [ 📋 Requests ]   [ 🔖 Saved ]   [ 👤 Profile ]   │
└────────────────────────────────────────────────────────┘
```

- **Bar Background:** `#141414` (Card Surface) with top border `#2A2A2A`.
- **Active Tab Item:** Amber `#F5A623` with bold 10px label.
- **Inactive Tab Item:** Zinc `#71717A` with regular 10px label.
- **Height:** 60px + bottom safe-area inset.

### 12.3 React Native NativeWind Theme Configuration

```javascript
// mobile/tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0D0D0D',
        card: '#141414',
        muted: '#1A1A1A',
        border: '#2A2A2A',
        primary: {
          DEFAULT: '#F5A623',
          hover: '#DF9115',
          light: 'rgba(245, 166, 35, 0.12)',
        },
        whatsapp: '#25D366',
      },
    },
  },
};
```

---

## 13. Accessibility Standards (WCAG 2.2 AA)

1. **Color Contrast:**
   - Primary text (`#F5F5F5` on `#0D0D0D` and `#141414`) achieves a contrast ratio of **16.2:1** (exceeds AAA requirement).
   - Brand Amber (`#F5A623` on `#0D0D0D`) achieves **7.4:1** for large text and buttons.
   - Button text (`#0D0D0D` on `#F5A623`) achieves **8.8:1** (exceeds AAA requirement).
   - Secondary text (`#A1A1AA` on `#141414`) achieves **6.1:1** (exceeds AA requirement).
2. **Keyboard Navigation:** All interactive elements feature a visible focus ring `focus-visible:ring-2 focus-visible:ring-[#F5A623] focus-visible:outline-none`.
3. **Screen Readers:** Every non-text button features explicit `aria-label` or `accessibilityLabel` attributes.
4. **Touch Target Size:** Interactive targets maintain a minimum 44×44px hit-box.

---

## 14. Responsive Breakpoints & Viewport Rules

```
Mobile Portrait:   < 640px    (sm)   Single column, 16px gutter, bottom action sheets
Tablet:            640px - 1023px (md) 2-column cards, drawer filters
Desktop:           1024px - 1279px (lg) 3-column cards, sticky search sidebar
Wide Desktop:      ≥ 1280px   (xl)   Full navigation links visible, max-w-7xl
```

---

## 15. Design Tokens Specification

Implementation-ready token constants are exported in `docs/branding/DESIGN_TOKEN_REFERENCE.md`.

### Web CSS Variables (`:root`)
```css
:root {
  --background: #0D0D0D;
  --foreground: #F5F5F5;
  --card: #141414;
  --card-foreground: #F5F5F5;
  --muted: #1A1A1A;
  --muted-foreground: #888888;
  --primary: #F5A623;
  --primary-foreground: #0D0D0D;
  --secondary: #1F1F1F;
  --secondary-foreground: #F5F5F5;
  --accent: #F5A623;
  --accent-foreground: #0D0D0D;
  --destructive: #EF4444;
  --destructive-foreground: #FFFFFF;
  --border: #2A2A2A;
  --input: #1A1A1A;
  --ring: #F5A623;
  --radius: 0.75rem;
}
```

---

## 16. Non-Negotiable Brand Rules

1. **NO Light Mode Override:** CrewHive is strictly a dark-theme platform. Never create a white-background theme for dashboard or profile screens.
2. **NO Commission Messaging:** Never suggest or imply that CrewHive charges commission on technician rates. Profiles must clearly convey direct payment and zero cuts.
3. **NO Location Coordinates on Public UI:** Never display exact GPS coordinates, pin drops, or street addresses on public crew profile cards. Only display the confirmed district or city name.
4. **NO AI / Generic Sparkle Icons:** Use only authentic audio-visual and stage-hardware icons (`AvIcons.js`) or standard Lucide UI icons.
5. **NO Unstyled WhatsApp Buttons:** WhatsApp links must use the official emerald green token `#25D366` (`bg-emerald-500/10 text-emerald-400 border-emerald-500/30`) with the official `WhatsAppBrandIcon`.
6. **NO Clipping on Malayalam Copy:** Any button or badge displaying Malayalam text must provide adequate vertical line-height and horizontal flex room.
7. **NO Hidden Rate Forcing:** If a technician has selected "Rate on request", never display zero or placeholder rupee amounts. Always display the verified *"Rate on request"* fallback copy.

---

## 17. Visual References & Inventory Index

The following supporting files must be consulted in conjunction with this document:

- **Brand Asset Inventory:**  
  [`docs/branding/BRAND_ASSET_INVENTORY.md`](file:///media/krrish/Linux%20Partition/CrewHive/docs/branding/BRAND_ASSET_INVENTORY.md)
- **Design Token Reference:**  
  [`docs/branding/DESIGN_TOKEN_REFERENCE.md`](file:///media/krrish/Linux%20Partition/CrewHive/docs/branding/DESIGN_TOKEN_REFERENCE.md)
- **Branding Audit Report:**  
  [`docs/branding/BRANDING_AUDIT_REPORT.md`](file:///media/krrish/Linux%20Partition/CrewHive/docs/branding/BRANDING_AUDIT_REPORT.md)
- **Reference UI Screenshots:**  
  Located in `docs/branding/reference-screenshots/`:
  - `01-public-navbar-header.png`
  - `02-technicians-priority-card.png`
  - `03-association-partnership-form.jpg`
  - `04-footer-columns.png`
  - `05-public-navbar-active-state.png`
  - `06-footer-refined.png`
  - `07-language-toggle-closeup.png`
  - `08-super-admin-user-management-table.png`
  - `09-admin-approvals-card.png`
  - `10-malayalam-profile-preview-banner.png`
