---
name: Lumen Script
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#434655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#747687'
  outline-variant: '#c4c5d8'
  surface-tint: '#1b4ee5'
  primary: '#003fd2'
  on-primary: '#ffffff'
  primary-container: '#2d5af0'
  on-primary-container: '#e7e8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#6b38d4'
  on-secondary: '#ffffff'
  secondary-container: '#8455ef'
  on-secondary-container: '#fffbff'
  tertiary: '#00567d'
  on-tertiary: '#ffffff'
  tertiary-container: '#0070a0'
  on-tertiary-container: '#d7ecff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#0037b9'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  note-title-lg:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  canvas-padding: 40px
  toolbar-gap: 8px
  sidebar-width: 280px
  gutter: 16px
  container-margin: 24px
---

## Brand & Style

The design system is centered on the concept of "Digital Zen"—a productivity environment that minimizes cognitive load while maximizing creative output. It targets students, researchers, and creative professionals who require the precision of digital tools with the tactile familiarity of analog stationery.

The visual style is **Corporate Modern** infused with **Minimalism**. It prioritizes high-quality white space to emulate physical paper, ensuring the user's content remains the focal point. AI-augmented features are treated with a distinct "Luminescent" layer, using subtle gradients and blurs to signify intelligent assistance without breaking the professional utility of the interface.

## Colors

The palette is anchored by **Digital Ink Blue**, a high-chroma primary used for active tools and primary actions. The background utilizes a **Soft Paper** neutral to reduce eye strain during long writing sessions.

**AI Interaction:**
The "AI Glow" is achieved through a secondary violet (#8B5CF6) and tertiary sky blue (#0EA5E9). These colors should only appear on components involving the AI Assistant or automated insights.

**Functional Tones:**
- **Success:** #10B981 (Emerald)
- **Error/Correction:** #EF4444 (Crimson)
- **Warning:** #F59E0B (Amber)

## Typography

This design system employs a dual-font strategy. **Hanken Grotesk** handles all functional UI elements—sidebars, toolbars, and settings—providing a sharp, contemporary feel that signals reliability. 

**Newsreader** is reserved for note previews and user-generated titles. Its literary, transitional serif qualities evoke the feeling of ink on paper, creating a warm contrast against the technical UI.

- Use **uppercase** for `label-sm` to denote secondary metadata.
- Note titles should utilize the `italic` variant of Newsreader to mimic the flow of handwriting.

## Layout & Spacing

The system uses a **Fixed Grid** for the dashboard and organizational views, transitioning to a **Contextual Canvas** for the note-taking experience.

- **The Sidebar:** Fixed at 280px. It contains the notebook hierarchy and library navigation.
- **The Toolbar:** Positioned at the top of the canvas, using an 8px spacing rhythm between tool icons (Pen, Highlighter, Eraser).
- **The AI Assistant Panel:** An overlay or right-aligned drawer that uses "Floating" logic—it does not push canvas content but sits on a layer above it.
- **Breakpoints:**
  - **Mobile (<768px):** Sidebar collapses into a bottom sheet; Toolbar becomes a scrollable horizontal bar.
  - **Desktop (>1024px):** Sidebar and AI Assistant can be pinned simultaneously.

## Elevation & Depth

Depth is used sparingly to maintain the "flat paper" aesthetic. 

1.  **Level 0 (Surface):** The main note-taking canvas (#F8F9FA). No shadows.
2.  **Level 1 (Tools):** Toolbars and secondary panels use **Low-Contrast Outlines** (1px solid #E5E7EB) rather than shadows to feel integrated with the page.
3.  **Level 2 (AI Assistant):** The AI panel uses **Glassmorphism**. It features a 12px backdrop blur and a very subtle, diffused violet shadow (rgba(139, 92, 246, 0.1)) to denote its "intelligent" status.
4.  **Level 3 (Modals):** Heavy ambient shadows with a 24px blur to focus attention on critical decisions.

## Shapes

The shape language is **Rounded** (0.5rem base), reflecting the smooth curves of handwriting and ink strokes. 

- **Tools:** Pens and highlighters in the toolbar should use `rounded-full` (pill shape) when selected to mimic the physical barrel of a pen.
- **Cards:** Notebook thumbnails use `rounded-lg` (1rem) to feel like bound journals.
- **AI Components:** Use slightly more aggressive rounding (`rounded-xl`) to distinguish "magic" elements from "functional" elements.

## Components

### Toolbars
Toolbars are horizontally oriented and centered at the top of the workspace. Icons are 24px, encased in a 40px touch target. The active tool is indicated by a Digital Ink Blue background with white icon fills.

### The "Lumen" AI Button
The 'Show Where I Went Wrong' button is the primary AI action. It must feature a subtle animated gradient border using the `ai_glow_gradient`. On hover, the button should emit a soft violet outer glow.

### Input Fields
Inputs are minimalist—bottom border only when inactive, moving to a full 1px primary blue stroke when focused. Backgrounds should be 2% darker than the surface they sit on.

### Notebook Chips
Used for tagging and categorization. These utilize low-saturation versions of the tag color with high-saturation text to maintain readability on the soft paper background.

### Cards (Notebooks)
Cards feature a "binding" detail on the left edge—a 4px vertical strip of a contrasting color. The title is displayed in `note-title-lg`.

### Checkboxes & Radio Buttons
Geometric and precise. When checked, they fill with `primary_color_hex` and use a "spring" animation to feel responsive and tactile.