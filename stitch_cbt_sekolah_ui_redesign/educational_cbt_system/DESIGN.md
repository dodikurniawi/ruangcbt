---
name: Educational CBT System
colors:
  surface: "#f8f9ff"
  surface-dim: "#cbdbf5"
  surface-bright: "#f8f9ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#eff4ff"
  surface-container: "#e5eeff"
  surface-container-high: "#dce9ff"
  surface-container-highest: "#d3e4fe"
  on-surface: "#0b1c30"
  on-surface-variant: "#434655"
  inverse-surface: "#213145"
  inverse-on-surface: "#eaf1ff"
  outline: "#737686"
  outline-variant: "#c3c6d7"
  surface-tint: "#0053db"
  primary: "#004ac6"
  on-primary: "#ffffff"
  primary-container: "#2563eb"
  on-primary-container: "#eeefff"
  inverse-primary: "#b4c5ff"
  secondary: "#4b41e1"
  on-secondary: "#ffffff"
  secondary-container: "#645efb"
  on-secondary-container: "#fffbff"
  tertiary: "#943700"
  on-tertiary: "#ffffff"
  tertiary-container: "#bc4800"
  on-tertiary-container: "#ffede6"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#dbe1ff"
  primary-fixed-dim: "#b4c5ff"
  on-primary-fixed: "#00174b"
  on-primary-fixed-variant: "#003ea8"
  secondary-fixed: "#e2dfff"
  secondary-fixed-dim: "#c3c0ff"
  on-secondary-fixed: "#0f0069"
  on-secondary-fixed-variant: "#3323cc"
  tertiary-fixed: "#ffdbcd"
  tertiary-fixed-dim: "#ffb596"
  on-tertiary-fixed: "#360f00"
  on-tertiary-fixed-variant: "#7d2d00"
  background: "#f8f9ff"
  on-background: "#0b1c30"
  surface-variant: "#d3e4fe"
typography:
  display-exam:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: "700"
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-student:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-admin:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-student:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-admin:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  student-gap: 24px
  admin-gap: 16px
  container-max-width: 1280px
---

## Brand & Style

The brand personality for this design system is **Professional Educational**. It
is designed to bridge the gap between institutional authority and modern
accessibility, specifically tailored for the Indonesian K-12 landscape. The UI
should evoke feelings of focus, calm, and reliability, minimizing "test anxiety"
while maintaining the seriousness of an academic environment.

The visual style follows a **Modern Corporate** aesthetic. It prioritizes
clarity and functionalism over decorative elements. By utilizing generous
whitespace, a systematic color-coded feedback loop, and high-quality typography,
the system ensures that the interface never distracts from the content—the
examination itself. For students, the interface feels supportive and clear; for
administrators, it feels powerful and organized.

## Colors

The palette is rooted in a "Trust Blue" foundation. **Primary Blue (#2563eb)**
is reserved for the most important actions, such as "Submit" or "Start Exam,"
providing a clear navigational beacon. **Indigo** serves as the secondary accent
for interactive elements that support the primary flow.

We use a tiered background system:

- **Pure White (#ffffff)**: Used for cards and exam content areas to maximize
  contrast.
- **Slate-50 (#f8fafc)**: Used for global page backgrounds to reduce screen
  glare.
- **Blue-50/100**: Used for highlighting active states, such as the selected
  question in a navigation grid.
- **Dark Slate (#0f172a)**: Specifically for the Admin Sidebar to provide a
  strong visual distinction between the management environment and the testing
  environment.

Semantic colors (Emerald, Amber, Red) follow stKamurd accessibility patterns for
pass/fail states, countdown warnings, and error messages.

## Typography

The system utilizes **Inter** for its exceptional legibility on digital screens
and its neutral, systematic character.

A dual-scale approach is applied:

1.  **Student View**: Typography is upsized to prioritize reading comprehension.
    Body text for exam questions is set at **18px** to reduce eye strain during
    long sessions.
2.  **Admin View**: Typography uses stKamurd SaaS density (**14px body**) to
    allow for complex data tables, student lists, and analytics dashboards.

All headings use a slightly tighter letter-spacing for a modern, professional
look, while body text maintains stKamurd spacing for maximum flow.

## Layout & Spacing

This design system employs a **12-column fluid grid** with contextual spacing
based on the user persona.

- **Student Interface (Mobile-First)**: Focuses on a single-column stack on
  mobile devices and a centered, focused column on desktop. Padding is generous
  (minimum 24px) to create large touch targets for younger students and to keep
  the interface feeling "open."
- **Admin Interface (Desktop-First)**: Utilizes a fixed left-hand sidebar
  (256px) with a fluid content area. It uses a "Comfortable" spacing density to
  maximize information display without cluttering the screen.

Breakpoints follow stKamurd patterns: Mobile (<640px), Tablet (640px-1024px),
and Desktop (>1024px). Horizontal margins for student exam pages should increase
significantly on wider screens to keep the question text within a readable line
length (max-width: 800px for reading).

## Elevation & Depth

The system uses **Tonal Layers** combined with **Ambient Shadows** to create
hierarchy.

- **Level 0 (Floor)**: Slate-50 background.
- **Level 1 (Cards/Content)**: Pure white surface with a `shadow-sm` (soft, 2px
  blur, 5% opacity).
- **Level 2 (Modals/Overlays)**: Pure white surface with a `shadow-lg` (15px
  blur, 10% opacity) to provide a distinct sense of "floating" above the exam
  content.

The Admin Sidebar uses a flat, dark treatment to ground the application's
structure. Borders are kept minimal, using **Slate-200** for subtle definition
between sections.

## Shapes

The shape language is **Rounded**, conveying friendliness and modern
accessibility.

- **Base components (Inputs, Small Buttons)**: `rounded-lg` (0.5rem / 8px).
- **Structural components (Cards, Modals)**: `rounded-xl` (1.5rem / 24px for
  student cards; 1rem / 16px for admin cards).

These soft corners help differentiate the app from legacy, boxy school software,
making the testing experience feel less rigid and intimidating.

## Components

- **Buttons**:
  - **Primary**: Solid Blue-600 background, white text. Large padding for
    student views (h-12 or h-14).
  - **Secondary**: Indigo outline with transparent background for secondary
    navigation.
  - **Tertiary**: Ghost style (text only) for low-priority actions like "Clear
    Answer."
- **Exam Cards**: White background, `rounded-xl`, with a subtle Slate-200
  border. These should house the question text and options clearly.
- **Inputs & Selects**: `rounded-lg` with a 1px Slate-300 border. On `:focus`,
  transition to a 2px Blue-600 ring.
- **Question Navigator**: A grid of small `rounded-lg` squares.
  - _Default_: Gray background.
  - _Answered_: Blue-600 background.
  - _Flagged/Doubtful_: Amber-500 background.
- **Progress Bar**: Thin, 8px height, Emerald-500 fill to provide positive
  reinforcement of completion.
- **Icons**: Use **Lucide React** with a 2px stroke width. Icons should always
  be accompanied by labels for clarity in the student view.
- **Badges/Chips**: Used for "Subject Tags" or "Difficulty Levels" in the admin
  view, using light-tinted backgrounds (e.g., Emerald-100 with Emerald-700
  text).
