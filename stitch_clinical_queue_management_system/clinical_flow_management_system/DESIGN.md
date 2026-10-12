---
name: Clinical Flow Management System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f4850'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#712ae2'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a4cfc'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-ticket:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.02em
  display-ticket-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system establishes a high-reliability, clinical-grade interface for acute healthcare environments, ambulatory clinics, and central hospital waiting facilities. The design language marries the data density and structural authority of legacy enterprise EHR suites (e.g., Epic Systems) with the ergonomic calm, clarity, and precision of modern Nordic functionalism.

### Personality & Emotional Tenor
- **Clinical Competence & Trust:** Zero decorative distraction. Every pixel, margin, and rule serves status legibility, task flow, and rapid triage.
- **Calm Under Duress:** High-stress triage and waiting room environments demand low cognitive friction, visual stillness, and unambiguous triage signifiers.
- **Equitable & Accessible:** Direct, uncompromising adherence to WCAG 2.1 AAA contrast ratios across state chips, caller badges, and priority tier markers.

### Design Movement & Aesthetic Doctrine
The design adopts a **Refined Modern Utility / Structural Flat** style. Depth is achieved via discrete, crisp 1px structural framing, tonal segmentation, and intentional architectural hierarchy—eschewing glowing neon gradients, soft neomorphic bevels, or ungrounded floating cards. Ticket displays and medical queue arrays privilege dense, tabular data layouts with instant, glanceable status verification.

## Colors

The color palette is architected for instant cognitive triage across desktop nurse workstations, wall-mounted display monitors, and patient kiosk surfaces.

### Semantic Triage & Tier Allocations
- **Clinical Primary (`#0284C7` / `#0369A1`):** Navigation anchors, primary operational triggers (e.g., "Next Patient", "Assign Room"), and structural focal points.
- **Operational Active State (`#10B981` / Emerald Green):** Reserved strictly for "Calling", "Serving In-Progress", and real-time station activations. Paired with a soft tint container (`#ECFDF5`) and dark text (`#065F46`).
- **Priority Tier — Elderly / Disability (`#F59E0B` / Amber):** Fast-track priority identification for geriatric, mobility-assisted, or pediatric triage. Paired with container `#FFFBEB` and text `#92400E`.
- **Priority Tier — VIP / Executive (`#7C3AED` / Royal Violet):** Dedicated track designations and specialty escort lanes. Paired with container `#F5F3FF` and text `#5B21B6`.
- **Priority Tier — Standard / General Queue (`#64748B` / Slate):** Baseline queue processing for standard appointments. Paired with container `#F1F5F9` and text `#334155`.

### Surfaces & Boundaries
- **Base Canvas:** `#F8FAFC` (Slate 50) provides a glare-reducing, clinical backdrop.
- **Card & Surface Layers:** `#FFFFFF` (Pure White) elevated strictly through structural perimeter framing.
- **Structural Dividing Line:** `#E2E8F0` (Slate 200) applied at 1px thickness to anchor all structural bounds and grid lines.
- **High-Contrast Text Hierarchy:** `#0F172A` (Slate 900) for headline queue metrics; `#334155` (Slate 700) for patient metadata; `#64748B` (Slate 500) for timestamps and tertiary descriptors.

## Typography

The typographic system relies on **Inter** configured with mandatory OpenType tabular figures (`tnum`, `zero`) across all numeric contexts, timestamps, ticket sequences, and room identifiers. This eliminates digit wobble during rapid real-time counter changes and guarantees column alignment across enterprise data sheets.

### Typographic Directives
- **Tabular Alignment:** All ticket indicators (e.g., `A-104`, `V-012`, `D-309`), clinical wait durations (`00:14:32`), and bay allocations must employ tabular figures (`font-feature-settings: "tnum" 1, "zero" 1`).
- **Hierarchy Separation:** Large display metrics prioritize quick visual acquisition from up to 8 meters away on department monitor walls (`display-ticket`). In clinical management tables, compact body text (`body-md` and `body-sm`) retains optimal vertical rhythm and high legibility.
- **Label Discipline:** Category chips, status designations, and clinical classification indicators utilize uppercase or title case with increased tracking (`letter-spacing: 0.02em - 0.03em`) for immediate glanceability.

## Layout & Spacing

The layout model is governed by a responsive 12-column fluid grid system pinned to an absolute 4px/8px incremental base rhythm. It is engineered for two primary hardware profiles: clinical administrative desktop consoles (dual-monitor workflows) and public triage overhead displays.

### Layout Form Factors & Reflow
- **Desktop & Clinical Consoles (≥ 1280px):** 12-column grid, `margin: 2rem` (32px), `gutter: 1.5rem` (24px). Accommodates a fixed-width left rail for department queues, a central patient routing grid, and a right-anchored diagnostic detail drawer.
- **Tablet & Station Carts (768px – 1279px):** 8-column layout, `margin: 1.5rem` (24px), `gutter: 1rem` (16px). Left rail collapses into an icon-and-count rail; ticket tables shift to compact horizontal cards.
- **Mobile Kiosk & Nurse Handhelds (< 768px):** 4-column layout, `margin: 1rem` (16px), `gutter: 1rem` (16px). Linear single-column flow with full-width triage interaction panels.
- **Overhead Large-Format Displays (Wall Monitors):** Full viewport utilization (fluid-height 3-column split: Currently Serving, Priority Counter, Next in Line) with rigid `1.5rem` minimum internal module spacing.

## Elevation & Depth

To guarantee sterile precision and clinical reliability, depth is rendered via crisp, physical containment rather than heavy drop shadows:

- **Level 0 (Base Canvas):** `#F8FAFC`. The foundational canvas layer across all viewports.
- **Level 1 (Card & Module Layer):** `#FFFFFF` surface bounded by a flat `1px solid #E2E8F0` border. No shadow. Used for list items, inactive ticket containers, and patient detail panels.
- **Level 2 (Active Calling Item / Hover Interactivity):** `#FFFFFF` surface bounded by `1px solid #CBD5E1` with a subtle, non-intrusive micro-shadow (`0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`).
- **Level 3 (Modals, Overlays, Floating Action Drawer):** `#FFFFFF` surface bounded by `1px solid #CBD5E1` with an enterprise elevation shadow (`0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)`).
- **Active State Highlighting:** Selected or actively called rooms do not elevate along the Z-axis; instead, they express focus via a `2px solid #0284C7` or `#10B981` structural left-border accent accompanied by a `2%` tinted background flood.

## Shapes

The design system employs a **Soft (Level 1)** geometric standard. This geometry strikes an intentional balance: sharp enough to retain the disciplined, authoritative structure of professional clinical software, yet gently softened at the corners to maintain modern ergonomic warmth.

### Geometry Specifications
- **Base Components (Inputs, Buttons, Cells):** `0.25rem` (4px) border radius.
- **Medium Modules (Queue Cards, Dialog Panels, Table Wrappers):** `0.5rem` (8px) border radius (`rounded-lg`).
- **Surface Overlays & Large Sheets:** `0.75rem` (12px) border radius (`rounded-xl`).
- **Triage Chips & Badges:** `0.25rem` (4px) soft corner radius or full pill (`9999px`) restricted solely to category indicators to emphasize status atomicity.

## Components

### Buttons
- **Primary Clinical Action:** Background `#0284C7`, text `#FFFFFF`, radius `4px`, padding `0.5rem 1rem`, font `label-lg`. Hover: `#0369A1`. Focus: `2px solid #0284C7` with `2px` offset.
- **Operational Calling Action ("Call Next"):** Background `#10B981`, text `#FFFFFF`, radius `4px`. Hover: `#059669`.
- **Secondary / Ghost:** Transparent background, `1px solid #E2E8F0`, text `#334155`. Hover: background `#F1F5F9`.
- **Destructive (No-Show / Cancel):** Transparent background, `1px solid #FCA5A5`, text `#DC2626`. Hover: background `#FEF2F2`.

### Chips & Triage Badges
- **Active / Calling:** Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`. Includes a `6px` solid emerald pulsing ping dot.
- **Elderly / Disability (Lansia/Disabilitas):** Background `#FFFBEB`, text `#92400E`, border `1px solid #FDE68A`.
- **VIP Priority:** Background `#F5F3FF`, text `#5B21B6`, border `1px solid #DDD6FE`.
- **Normal Queue:** Background `#F1F5F9`, text `#334155`, border `1px solid #CBD5E1`.

### Queue Table & Data Rows
- High-density tabular layout. Cell padding: `0.75rem 1rem`.
- Row dividers: `1px solid #E2E8F0`. Hover row: `#F8FAFC`.
- Selected/Serving row: `#F0FDF4` left-border `3px solid #10B981`.
- Ticket sequence column formatted in Inter with `font-feature-settings: "tnum" 1`, weight `600`, color `#0F172A`.

### Input Fields & Controls
- Height: `38px` (compact enterprise standard).
- Border: `1px solid #CBD5E1`, background `#FFFFFF`, text `#0F172A`, radius `4px`.
- Focus: Border `#0284C7`, outline `2px solid rgba(2, 132, 199, 0.2)`.
- Integrated search bar features clear action, prefix keyboard shortcut indicator (`⌘K`), and instant patient ID / MRN filter logic.

### Checkboxes & Radios
- Size: `16px x 16px`, radius `3px` (checkbox) / `50%` (radio).
- Border: `1.5px solid #94A3B8`.
- Checked state: Background `#0284C7`, border `#0284C7`, white iconography.

### Queue Card Module (Calling Wall / Station Bay)
- Outer container: Surface `#FFFFFF`, border `1px solid #E2E8F0`, radius `8px`, padding `1.25rem`.
- Visual partition separating the room/doctor identifier (`label-md`, `#64748B`) from the prominent current ticket numeral (`display-ticket`, `#0F172A`).
- Bottom metadata strip: Average consultation pace indicator, patient wait timer, and queue depth badge.