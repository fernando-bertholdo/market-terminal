<!-- synced from fernando-bertholdo/4-successful-AI-life (83174df) on 2026-04-10 05:26:40 -0300 -->
---
name: ui-excellence
description: 'Triage router for the ui-excellence plugin. Analyzes task context and routes to the right specialist skill(s) — often multiple at once. Use when building, reviewing, or refining any web UI: components, pages, layouts, forms, modals, animations, styles, audits, copywriting, or engagement design.'
---

# UI Excellence — Coordinator

## Overview

This skill is a **triage router** that coordinates twelve specialized UI skills organized in five groups. When invoked, it analyzes what you are working on and automatically loads the relevant skill(s) — often multiple at once.

> "Great interfaces rarely come from a single thing. It's usually a collection of small things that compound into a great experience."

## Skills Catalog

### Foundations (original)

| Skill | Invoke | Domain |
|-------|--------|--------|
| `animation-motion` | `/ui-excellence:animation-motion` | Easing, springs, gestures, transitions, performance, `prefers-reduced-motion` |
| `visual-polish` | `/ui-excellence:visual-polish` | Text wrapping, border radius, shadows, font smoothing, tabular nums, optical alignment |
| `web-standards` | `/ui-excellence:web-standards` | Accessibility, forms, focus states, typography, content handling, images, perf, dark mode, i18n |
| `accessibility` | `/ui-excellence:accessibility` | Semantic HTML, keyboard navigation, ARIA, color contrast, screen readers, WCAG 2.1 AA |

### Systems (macro-design)

| Skill | Invoke | Domain |
|-------|--------|--------|
| `refactoring` | `/ui-excellence:refactoring` | Visual hierarchy, spacing scales, color palettes, depth/shadows, design tokens, grayscale-first workflow |
| `typography` | `/ui-excellence:typography` | Typeface selection, font pairing, responsive type, web font loading, FOUT/FOIT, typographic scales |

### Audit (evaluation)

| Skill | Invoke | Domain |
|-------|--------|--------|
| `heuristics` | `/ui-excellence:heuristics` | Nielsen's 10 heuristics, Krug usability, severity ratings, cognitive walkthrough, information architecture |
| `cro` | `/ui-excellence:cro` | Conversion rate optimization, funnel mapping, A/B testing, objection handling, persuasion assets |

### Interaction (micro-details)

| Skill | Invoke | Domain |
|-------|--------|--------|
| `microinteractions` | `/ui-excellence:microinteractions` | Triggers, rules, feedback, loops & modes, loading states, state transitions, input feedback |

### Behavior (engagement)

| Skill | Invoke | Domain |
|-------|--------|--------|
| `hooked` | `/ui-excellence:hooked` | Hook Model (Trigger→Action→Variable Reward→Investment), habit formation, ethics evaluation |
| `retention` | `/ui-excellence:retention` | Behavior design (B=MAP), Ability Chain, activation milestones, onboarding friction, tiny habits |
| `copy` | `/ui-excellence:copy` | SUCCESs checklist (Simple, Unexpected, Concrete, Credible, Emotional, Stories), sticky messaging |

## Triage Logic

When this skill is invoked, follow this decision process:

```
START: What is the task?
│
├── Full UI audit / review?
│   └── YES → Apply foundations (all 4) + heuristics + refactoring
│
├── Landing page / conversion / "why visitors leave"?
│   └── YES → Apply cro + heuristics + copy
│
├── Onboarding / activation / "users drop off"?
│   └── YES → Apply retention + hooked + heuristics
│
├── New component build (modal, form, dropdown, tabs)?
│   └── YES → Apply web-standards + accessibility + animation-motion + microinteractions
│
├── Design system / tokens / color / spacing?
│   └── YES → Apply refactoring + visual-polish + typography
│
├── Typography / fonts / readability?
│   └── YES → Apply typography + web-standards (type section)
│
├── Animation / transition / motion?
│   └── YES → Apply animation-motion + microinteractions
│
├── Accessibility / WCAG / keyboard / ARIA?
│   └── YES → Apply accessibility + web-standards (a11y section)
│
├── Polish / refinement / "make it feel better"?
│   └── YES → Apply visual-polish + microinteractions
│
├── Messaging / copy / "make it memorable"?
│   └── YES → Apply copy + cro (copywriting section)
│
├── Engagement / "users aren't coming back"?
│   └── YES → Apply hooked + retention
│
└── General / unsure
    └── Apply web-standards + visual-polish (safe defaults)
```

## Signal-Based Routing

When triaging, look for these signals in the task and files:

### Route to `animation-motion` when:
- Files contain `transition`, `animation`, `@keyframes`, `transform`, spring config
- Task mentions: animate, motion, easing, gesture, drag, spring, entrance/exit
- Working with: modals, drawers, toasts, tooltips, popovers, dropdowns (animation aspect)
- CSS includes: `transition-*`, `animation-*`, `will-change`, `@starting-style`

### Route to `visual-polish` when:
- Task is about refining/polishing existing UI
- Files contain: `border-radius`, `box-shadow`, `font-variant-numeric`, `text-wrap`
- Working with: spacing, shadows, alignment, text rendering, number displays
- Focus is on "make it feel better" rather than adding new functionality

### Route to `web-standards` when:
- Building or reviewing any web component or page
- Files are `.tsx`, `.jsx`, `.html`, `.css`, `.scss`, or Tailwind configs
- Task involves: forms, images, performance, dark mode, i18n, navigation, state management
- Code review or audit requested

### Route to `accessibility` when:
- Task mentions: accessibility, a11y, WCAG, screen reader, keyboard navigation
- Building interactive components: dropdowns, modals, tabs, forms
- Files contain: `aria-*`, `role=`, `tabindex`, `<label>`, focus management code
- Audit or compliance check requested

### Route to `refactoring` when:
- Task mentions: "my UI looks off", "fix the design", color palette, visual hierarchy, design system
- Building design tokens, constrained spacing/color scales
- Creating dark mode themes or consistent component styling
- Files contain: Tailwind config, CSS custom properties, token definitions

### Route to `typography` when:
- Task mentions: font pairing, typeface selection, line height, responsive type
- Working with: web font loading, variable fonts, typographic scales, FOUT/FOIT
- Files contain: `@font-face`, `font-family`, `font-display`, type scale variables

### Route to `heuristics` when:
- Task mentions: usability audit, UX review, "users are confused", heuristic evaluation
- Reviewing navigation, form completion rates, information architecture
- Task mentions: Nielsen heuristics, cognitive walkthrough, usability testing

### Route to `cro` when:
- Task mentions: conversion rate, A/B test, "landing page isn't converting", bounce rate
- Designing experiment hypotheses, auditing checkout flows
- Working with: landing pages, signup flows, pricing pages, objection handling

### Route to `microinteractions` when:
- Task mentions: button feedback, loading state, toggle design, state transitions
- Designing: form validation responses, progress indicators, confirmation dialogs
- Working on: any UI element where users expect immediate feedback
- Files contain: state machines, transition logic, feedback animations

### Route to `hooked` when:
- Task mentions: engagement loops, habit formation, "users aren't coming back"
- Designing: notification strategies, streaks, progress systems, variable rewards
- Analyzing: daily active users, retention loops, habit zone

### Route to `retention` when:
- Task mentions: "users drop off", activation rate, onboarding friction, churn
- Designing: activation milestones, time-to-value reduction, first-session experience
- Analyzing: cohort retention curves, aha moment identification

### Route to `copy` when:
- Task mentions: "make it memorable", sticky messaging, tagline, value proposition
- Writing: pitch decks, product explanations, presentations
- Simplifying: complex product messaging, onboarding copy, error messages

## Multi-Routing (Common Combinations)

Most UI tasks benefit from **multiple skills simultaneously**. Apply all that match:

| Task | Skills to Apply |
|------|----------------|
| Building a new modal | `web-standards` + `accessibility` + `animation-motion` + `microinteractions` |
| Creating a dropdown menu | `web-standards` + `accessibility` + `animation-motion` |
| Polishing a dashboard | `visual-polish` + `web-standards` + `refactoring` |
| Reviewing a form | `web-standards` + `accessibility` + `heuristics` |
| Adding toast notifications | `animation-motion` + `accessibility` + `microinteractions` |
| Building a tab component | `accessibility` + `web-standards` + `animation-motion` |
| Full page audit | ALL foundations + `heuristics` + `refactoring` |
| Dark mode implementation | `web-standards` + `visual-polish` + `refactoring` |
| Performance optimization | `web-standards` + `animation-motion` (perf sections) |
| Landing page design | `cro` + `copy` + `visual-polish` + `web-standards` |
| Onboarding flow | `retention` + `hooked` + `heuristics` + `microinteractions` |
| Design system creation | `refactoring` + `typography` + `visual-polish` |
| Engagement audit | `hooked` + `retention` + `heuristics` |
| Marketing copy review | `copy` + `cro` |
| Component library polish | `visual-polish` + `microinteractions` + `accessibility` |
| Typography system setup | `typography` + `refactoring` + `web-standards` |

## Workflow

### Step 1 — Identify Context

Determine the task type and files involved:
- Read the files being worked on (or the user's request)
- Identify which signals match (see routing sections above)

### Step 2 — Load Skills

Invoke the matched skill(s) using their plugin namespace:
- `/ui-excellence:animation-motion`
- `/ui-excellence:visual-polish`
- `/ui-excellence:web-standards`
- `/ui-excellence:accessibility`
- `/ui-excellence:refactoring`
- `/ui-excellence:typography`
- `/ui-excellence:heuristics`
- `/ui-excellence:cro`
- `/ui-excellence:microinteractions`
- `/ui-excellence:hooked`
- `/ui-excellence:retention`
- `/ui-excellence:copy`

Load **only** the matched skills. For full audits, load foundations + heuristics + refactoring.

### Step 3 — Apply

Follow each loaded skill's guidelines. When multiple skills are active, apply in this priority order:

1. **Accessibility first** — structural correctness before polish
2. **Web standards** — patterns and anti-patterns
3. **Heuristics** — usability evaluation (if applicable)
4. **Refactoring** — design system and visual hierarchy (if applicable)
5. **Typography** — type system (if applicable)
6. **Visual polish** — refinements and details
7. **Microinteractions** — feedback and state transitions
8. **Animation** — motion and transitions on top of solid foundation
9. **Behavior** (hooked, retention, copy) — engagement layer last

### Step 4 — Review Output

Consolidate findings from all applied skills into a single output. Use `file:line` format for code review. Group by severity:

1. **Must Fix** — Accessibility violations, anti-patterns, broken interactions
2. **Should Fix** — Standards deviations, missing states, performance issues, usability problems
3. **Polish** — Visual refinements, animation improvements, detail enhancements
4. **Engagement** — Behavior/retention/copy suggestions (these are strategic, not defects)

## When to Use

- Building any web UI component or page
- Reviewing or auditing existing interfaces
- Polishing interfaces before release
- Implementing modals, forms, dropdowns, tabs, toasts, drawers
- Refining animations, transitions, and microinteractions
- Checking accessibility compliance (WCAG 2.1 AA)
- Conducting design-to-code reviews or heuristic evaluations
- Optimizing landing pages and conversion funnels
- Designing engagement loops and retention mechanisms
- Crafting sticky messaging and product copy
- Building or auditing design systems and typography

## When NOT to Use

- Backend/API-only code with no UI
- CLI tools or terminal interfaces
- Configuration files with no UI impact
- Database migrations or schema changes
- Pure business logic with no user-facing output

## Attribution

This coordinator routes to skills from two sources:

**Foundations (original):**
- **Emil Kowalski** — Animation & motion design engineering
- **Jakub Krehel** — Visual polish and interface details
- **Vercel** — Web Interface Guidelines
- **WCAG 2.1** — Web Content Accessibility Guidelines

**Adopted (MIT, from [wondelai/skills](https://github.com/wondelai/skills)):**
- **Adam Wathan & Steve Schoger** — Refactoring UI
- **Jason Santa Maria** — On Web Typography
- **Jakob Nielsen & Steve Krug** — Usability heuristics
- **Dr. Karl Blanks & Ben Jesson** — CRO methodology
- **Dan Saffer** — Microinteractions
- **Nir Eyal** — Hooked (habit-forming products)
- **BJ Fogg** — Behavior design (Tiny Habits)
- **Chip & Dan Heath** — Made to Stick
