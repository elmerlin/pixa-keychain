---
name: "Pixtopia Keychain"
description: "The Pixtopia monochrome system translated into a compact Pixagram browser wallet."
colors:
  dark-canvas: "#0b0b0c"
  dark-surface: "#151515"
  dark-raised: "#1c1c1c"
  dark-hover: "#232323"
  dark-border: "#262626"
  dark-borderStrong: "#363636"
  dark-ink: "#f5f5f5"
  dark-inkSecondary: "#a3a3a3"
  dark-inkMuted: "#737373"
  dark-primary: "#f5f5f5"
  dark-onPrimary: "#0b0b0c"
  dark-spark: "#ff4f8b"
  dark-focus: "rgba(76, 168, 255, 0.55)"
  dark-success: "#3ee0a1"
  dark-warning: "#ffb547"
  dark-danger: "#ff6b6b"
  dark-glass: "rgba(21, 21, 21, 0.75)"
  dark-scrim: "rgba(0, 0, 0, 0.7)"
  dark-dot: "rgba(255, 255, 255, 0.06)"
  light-canvas: "#fafafa"
  light-surface: "#ffffff"
  light-raised: "#f4f4f5"
  light-hover: "#ededee"
  light-border: "#e7e7e9"
  light-borderStrong: "#d4d4d8"
  light-ink: "#0b0b0c"
  light-inkSecondary: "#52525b"
  light-inkMuted: "#71717a"
  light-primary: "#0b0b0c"
  light-onPrimary: "#fafafa"
  light-spark: "#e0186a"
  light-focus: "rgba(76, 168, 255, 0.55)"
  light-success: "#0e8f63"
  light-warning: "#b8751c"
  light-danger: "#c0352d"
  light-glass: "rgba(255, 255, 255, 0.78)"
  light-scrim: "rgba(0, 0, 0, 0.4)"
  light-dot: "rgba(0, 0, 0, 0.06)"
  prism-pink: "#ff4f8b"
  prism-amber: "#ffb547"
  prism-mint: "#3ee0a1"
  prism-sky: "#4ca8ff"
typography:
  display-value:
    fontFamily: "Geist Mono, monospace"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  overlay-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.011em"
  body-component:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.011em"
  input:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.011em"
  button:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.011em"
  caption:
    fontFamily: "Geist, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.011em"
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.011em"
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0"
  mono-caption:
    fontFamily: "Geist Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0"
  eyebrow:
    fontFamily: "Geist Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "32px"
  huge: "48px"
components:
  button-primary:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-onPrimary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-alternative:
    backgroundColor: "{colors.dark-raised}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-alternative-hover:
    backgroundColor: "{colors.dark-hover}"
    textColor: "{colors.dark-ink}"
  input:
    backgroundColor: "{colors.dark-raised}"
    textColor: "{colors.dark-ink}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-focus:
    backgroundColor: "{colors.dark-hover}"
    textColor: "{colors.dark-ink}"
  small-card:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  available-card:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.lg}"
    padding: "6px 16px"
  operation-fields:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  segmented-tab:
    textColor: "{colors.dark-inkSecondary}"
    rounded: "{rounded.sm}"
    padding: "0 4px"
    height: "34px"
    width: "80px"
  segmented-tab-selected:
    backgroundColor: "{colors.dark-raised}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.sm}"
  checkbox-checked:
    backgroundColor: "{colors.dark-primary}"
    textColor: "{colors.dark-onPrimary}"
    rounded: "{rounded.xs}"
    size: "18px"
  recovery-details:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.md}"
  popup:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xxl}"
  button-primary-light:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-onPrimary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-alternative-light:
    backgroundColor: "{colors.light-raised}"
    textColor: "{colors.light-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-alternative-hover-light:
    backgroundColor: "{colors.light-hover}"
    textColor: "{colors.light-ink}"
  input-light:
    backgroundColor: "{colors.light-raised}"
    textColor: "{colors.light-ink}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-focus-light:
    backgroundColor: "{colors.light-hover}"
    textColor: "{colors.light-ink}"
  small-card-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  available-card-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.lg}"
    padding: "6px 16px"
  operation-fields-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  segmented-tab-light:
    textColor: "{colors.light-inkSecondary}"
    rounded: "{rounded.sm}"
    padding: "0 4px"
    height: "34px"
    width: "80px"
  segmented-tab-selected-light:
    backgroundColor: "{colors.light-raised}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.sm}"
  checkbox-checked-light:
    backgroundColor: "{colors.light-primary}"
    textColor: "{colors.light-onPrimary}"
    rounded: "{rounded.xs}"
    size: "18px"
  recovery-details-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.md}"
  popup-light:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xxl}"
---

# Design System: Pixtopia Keychain

## Overview

**Creative North Star: "The Pixel Gallery"**

Pixtopia Keychain translates Pixtopia’s dark-first monochrome system into a compact wallet. Charcoal tonal steps, hairline borders, local Geist type and crisp pixel glyphs keep accounts, balances and actions legible. Light mode uses the same semantic relationships.

The inherited visual authority is the read-only sibling [DESIGN.md](../pixtopia/DESIGN.md), [tokens.ts](../pixtopia/src/theme/tokens.ts) and [motion.ts](../pixtopia/src/theme/motion.ts), together with the approved [graphics handoff](docs/design/graphics-handoff.html). This document records the implemented browser translation; [AGENTS.md](AGENTS.md) retains the product and signing constraints.

**Key Characteristics:**

- Monochrome primary actions and quiet tonal surfaces.
- Locally bundled Geist and Geist Mono, with chain data kept distinct from prose.
- One spark accent; Prism belongs to branding, artwork, identicons and loading.
- Crisp pixel geometry, hairlines and compact rounded controls.
- Visible keyboard focus, restrained press feedback and reduced-motion support.

## Colors

The palette is neutral by default, with separate dark and light values for each semantic role. The frontmatter prefixes identify themes; runtime CSS uses the unprefixed property, such as `--canvas`. `:root` and `.theme` default to dark, and `.theme.light` changes the palette. Existing upstream-compatible aliases resolve to these same roles.

### Primary

`primary` and `onPrimary` form the monochrome action pair. `spark` is the only accent. `focus` is reserved for keyboard focus; it is not an extra decorative accent. Success, warning and danger communicate status alongside text or a recognizable symbol.

### Neutral

| Role | Application |
| --- | --- |
| `canvas` | Window and page ground |
| `surface` | Cards, field groups, dropdowns and popups |
| `raised` | Inputs, alternative buttons, selected tab fill |
| `hover` | Focused field fill and hovered controls |
| `border` / `borderStrong` | Hairlines / stronger interactive boundaries |
| `ink` / `inkSecondary` / `inkMuted` | Main content / supporting copy / captions and placeholders |
| `glass` / `scrim` / `dot` | Floating action surface / overlay ground / quiet dot artwork |

The four `prism-*` values are the shared brand signature. The Keeper-tooth mark, approved empty and result artwork, identicons and pixel loading states carry it. They do not establish colored button variants.

**The Monochrome Chrome Rule.** Primary actions use primary and onPrimary. Spark is the single accent; the Prism palette does not tint ordinary controls. Semantic success, warning and danger accompany state text or symbols.

**The Theme Parity Rule.** Use semantic CSS custom properties and check the same surface in both themes. A selected or failed state must remain understandable without color.

## Typography

Geist is the body and heading family; Geist Mono carries chain data and the explicitly approved small mono labels. Six local WOFF2 faces are registered in [fonts.css](public/assets/fonts/fonts.css): Geist 400/500/600/700 and Geist Mono 400/500, with `font-display: swap`. The family variables are `--font-body` and `--font-mono`; fallback families are sans-serif and monospace.

| Frontmatter role | Implemented use |
| --- | --- |
| `display-value` | Estimated account value; this browser surface uses the 28px mono treatment |
| `headline` | Request title; shared mixins retain a 1.45 line height |
| `overlay-title` / `title` | Popup heading / standard page heading |
| `body` / `body-component` | Global prose / the reused Geist mixin treatment |
| `input` / `button` / `label` | Field content / action label / field label |
| `caption` | Supporting copy |
| `mono` / `mono-caption` | Chain values, site domains and smaller numeric context |
| `eyebrow` | Existing small uppercase labels, with the source mixin’s tracking and line height |

The browser’s type declarations are authoritative here. The theme exports a 32px display size, but sampled wallet display values use the `display-value` role above; do not substitute the sibling’s native display styling. Mono roles omit a fixed line height where the source inherits it. Selected segmented labels gain weight as well as a tonal fill.

**The Readable Chain Data Rule.** Use Geist Mono with tabular numerals for amounts, account names, keys, hashes, timestamps and serialized data. Preserve wrapping and selection where a person must review or copy the value.

## Layout

The popup is 435px wide and its app surface is 600px high. It uses a compact single column with a 16px page gutter. Dialogs fill their window and use 20px vertical / 16px horizontal padding. This implementation does not define a new tablet or desktop breakpoint system.

The shared spacing scale is recorded in the frontmatter. Most page and form groups use 16px gaps, field lists use 8px, and transaction groups use 12px. The common page title is a nonshrinking 64px row. Form panels use a scrollable flex column with `min-height: 0`; their footer actions remain reachable. Long review data wraps anywhere, while compact identity rows may constrain their content.

A request is arranged as site and title, account context, reviewed fields, then Cancel and Confirm. The introduction is nonshrinking, with an internal scroll limit at 46% for exceptionally long context; the detail area scrolls independently. The action row does not shrink. The floating home action surface sits 16px from the sides and bottom, is 56px high, and uses the larger sheet radius.

## Elevation & Depth

**The Tonal Depth Rule.** Use canvas, surface and raised for ordinary hierarchy. Reserve the shared overlay shadow for floating surfaces; keep resting cards flat.

The only shared shadow token is `--overlay-shadow`, with dark and light values recorded in the sidecar. Popups pair it with a surface fill and hairline. The floating home action surface uses `--glass` and a 12px backdrop blur. Glass is not a general card treatment. Dropdowns and popups remain bounded by the available viewport, with their own scrolling content.

## Shapes

The frontmatter records the six radius steps: smallest controls, small indicators, input/button corners, cards, overlays and pills. Standard hairlines are 1px. Common controls use the medium radius, shared cards and request field groups use the large radius, and popups and the floating action surface use the extra-large radius. Avatar images use the small radius.

Glyphs are filled pixel geometry on a 24px viewBox with 2×2 cells, inherited `currentColor` and crisp edges. The approved Keeper-tooth mark adds its small tooth while preserving the parent Prism Corner counter and silhouette. Do not redraw it from text. Artwork and avatar rendering retain crisp sampling; validated on-chain raster avatars use the mirrored 5×5 identicon as fallback.

## Components

The frontmatter records reusable default variants. Unqualified component names are dark; `-light` siblings record their light equivalents. The sidecar provides eight compact HTML/CSS renderings of implemented patterns. They inherit the application’s CSS variables and local font families; their local font URLs use the same `/assets/fonts/` root as the extension. They are visual examples, not new application behavior.

### Buttons

The shared button exposes Important and Alternative variants. Important uses the monochrome pair; hover reduces opacity to 0.9. Alternative uses raised fill, a border hairline and ink, moving to hover fill on hover. Both use the medium radius, centered labels and an optional 24px glyph. Medium, tall and small variants have minimum heights of 44px, 52px and 36px; the small variant uses 13px type and 8px / 12px padding. Request actions enforce a 44px minimum even when passed the small variant. Disabled controls use opacity 0.45 and a not-allowed cursor.

### Inputs / Fields

The shared field has raised fill, a hairline, medium corners, 12px padding and a 44px minimum height. Focus lifts the fill to hover and strengthens the border. Keyboard focus adds the 2px focus ring to the field wrapper, avoiding a second ring on the input itself. Number fields use Geist Mono. Errors have a textual message in danger ink; the field border strengthens without becoming the sole error signal.

### Cards / Containers

Shared small cards use surface fill, a hairline, large corners and 16px padding. Available-value cards use the same shape with denser 6px / 16px padding and mono values. Action cards use medium corners and 20px padding. Form panels have extra-large top corners, 16px padding and internal scrolling. Centered popups use extra-large corners, 24px padding, a scrim and the overlay shadow.

### Navigation

The implemented segmented control uses a surface track, hairline and medium outer corners. Each label is 80px wide and 34px high. Its raised glider has small corners; selected labels use ink and weight 600, while unselected labels use secondary ink. Keyboard focus is visible on the radio’s adjacent label. The glider moves with the soft duration and morph easing. Standard top bars use a 64px minimum height and keep pixel actions quiet.

### Checkbox

The custom checkbox is an 18px square with extra-small corners. Checked state uses the primary pair and the existing pixel check glyph. The focusable wrapper exposes checked and disabled state; its textual label remains visible. Disabled treatment follows the common opacity rule.

### Request review

The operation field group is a large-cornered surface with a hairline and 16px padding. Label/value rows use 12px gaps. Labels use secondary 13px prose; values use 13px mono, align right, and can use at most 70% of the row before wrapping. The bottom action pair is separated by a top hairline and 12px padding. This visual organization must continue to show the data actually being signed.

### Recovery and loading

The error page leads with human recovery guidance. A native Details disclosure contains selectable, wrapping mono diagnostics in a scrollable area; Copy details stays reachable. Loading uses stepped opacity on the fixed-orientation pixel mark, with a 1.2s cycle and staggered cells. Its Prism colors are artwork, not a new status-control palette.

### Interaction and motion

Browser timing translates the sibling motion vocabulary rather than running native springs: fast is 150ms and soft is 220ms, with gentle, snappy, morph and responsive easing variables recorded in the sidecar. Buttons and role buttons press to scale 0.96. Keyboard focus uses a 2px `--focus` outline with 2px offset; click and tap do not acquire that ring. Reduced motion removes animations, transitions and press transforms and sets the two motion durations to zero. It preserves state and text.

## Do's and Don'ts

### Do:

- Do use the semantic variables from src/common-style/theme.scss in components.
- Do check both themes at 435 × 600, including long data, errors, focus and loading.
- Do keep the request site, title and action pair visible while transaction details scroll.
- Do use the approved pixel glyphs and Keeper-tooth mark with crisp edges and inherited ink.
- Do keep copy short, human and task-first; place technical diagnostics behind Details.
- Do preserve the existing reduced-motion behavior, keyboard focus and non-color state cues.

### Don't:

- Don’t introduce decorative color into chrome or use spark as the primary button fill.
- Don’t load fonts or appearance assets from remote services.
- Don’t add strokes, smooth replacement icons or arbitrary recoloring to the filled pixel glyphs.
- Don’t truncate a signing value that needs review; wrap long keys and payloads within the scrollable detail area.
- Don’t import sibling-only screen compositions, responsive breakpoints or component APIs into this extension by inference.

Extraction evidence: the four shared style files (`theme.scss`, `variable.scss`, `mixins.scss`, `base.scss`), local fonts, shared buttons, inputs, cards, tabs, checkbox, popup, recovery UI, avatar and loader styles, and dialog `Operation`. Visual evidence is indexed in [.e2e/index.html](.e2e/index.html), with both themes at the actual popup size. No implementation or sibling files were changed by this documentation pass.
