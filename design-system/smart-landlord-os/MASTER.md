# Design System Master: Smart Landlord OS

Generated and curated with **UI/UX Pro Max v2.15.0**.

## 1. Visual Direction & Theme Strategy
- **Domain:** Property Management, Automated Utility Billing & Financial Ledger
- **Theme Support:** Dual-Mode (**Light** & **Dark**) with persistent user toggle + system preference fallback
- **Brand Palette:** Trust Teal (`#0F766E` / `#14B8A6`) + Professional Blue (`#0369A1` / `#0284C7`)
- **Surface Style:** Clean elevated cards with subtle borders; frosted glass (`backdrop-blur-md`) reserved strictly for overlays, modals, and floating action bars.
- **Motion:** Subtle (150–250ms `cubic-bezier(0.4, 0, 0.2, 1)`); full `prefers-reduced-motion: reduce` compliance.
- **Density:** 7/10 — Balanced financial density with clear scannable hierarchy.

## 2. Color Tokens

| Token | Light Mode | Dark Mode | Purpose |
|---|---|---|---|
| `--bg-canvas` | `#F8FAFC` | `#0B1120` | Main application background |
| `--bg-surface` | `#FFFFFF` | `#111827` | Cards, panels, tables, modals |
| `--bg-subtle` | `#F1F5F9` | `#1E293B` | Secondary surfaces, inputs, table headers |
| `--bg-elevated` | `#E2E8F0` | `#334155` | Hover states, segmented controls |
| `--text-primary` | `#0F172A` | `#F8FAFC` | Headings, primary data, amounts |
| `--text-secondary` | `#334155` | `#CBD5E1` | Body labels, table cells |
| `--text-muted` | `#475569` | `#94A3B8` | Metadata, helper text (4.5:1+ contrast) |
| `--border-default` | `#E2E8F0` | `#1E293B` | Card and table borders |
| `--border-strong` | `#CBD5E1` | `#334155` | Input borders, emphasized dividers |
| `--color-primary` | `#0F766E` | `#14B8A6` | Brand primary (Teal) |
| `--color-accent` | `#0369A1` | `#38BDF8` | Interactive accent (Professional Blue) |
| `--color-success` | `#059669` | `#34D399` | Paid status, positive collection |
| `--color-warning` | `#D97706` | `#FBBF24` | Unpaid / pending within grace period |
| `--color-danger` | `#DC2626` | `#F87171` | Overdue, destructive actions |
| `--color-ring` | `#0D9488` | `#2DD4BF` | Keyboard focus ring |

## 3. Typography (`next/font/google`)
- **Sans (`--font-sans`):** `Fira Sans` (400, 500, 600, 700) — UI labels, navigation, headings, descriptions
- **Mono (`--font-mono`):** `Fira Code` (400, 500, 600, 700) — Currency (`Rs.`), meter readings, invoice numbers, dates (`font-variant-numeric: tabular-nums`)
- **Minimum Size:** `12px` (`0.75rem`) across all labels and badges; `14px–16px` for body and inputs.

## 4. Mandatory UX & Accessibility Rules
1. **Contrast:** Minimum 4.5:1 contrast for normal text in both Light and Dark modes.
2. **Focus Visibility:** Visible `:focus-visible` ring (`2px solid var(--color-ring)`) on all interactive controls.
3. **Touch Targets:** Minimum `40×40px` / `44×44px` hit areas on mobile controls; action buttons on cards must remain visible on touch devices (never hover-only).
4. **Icon Discipline:** Use Lucide SVG icons exclusively in UI components — never emoji characters as UI icons.
5. **Reduced Motion:** Respect `prefers-reduced-motion: reduce` globally.
