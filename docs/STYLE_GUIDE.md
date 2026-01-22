# Hireflow Style Guide v2.0

A modern, minimal design system inspired by premium SaaS landing pages. Ultra-clean aesthetics with subtle depth, professional typography, and confident green accents.

---

## Brand Overview

**Hireflow** is a recruitment lead generation agency under TNW Holdings UK Ltd. We produce high-quality leads for recruitment companies looking to scale their client acquisition, specialising in Energy, Packaging, and Manufacturing sectors.

---

## Design Philosophy

1. **Ultra-Minimal**: Light gray page backgrounds, white cards, no visual clutter
2. **Subtle Depth**: Soft shadows and borders create hierarchy without heaviness
3. **Green-Forward**: Primary actions use brand green - confident and growth-oriented
4. **Large Typography**: Bold headlines with faded accent text for visual interest
5. **Whitespace-Rich**: Generous padding and margins for breathing room
6. **Social Proof Built-In**: CTAs with avatars, urgency indicators, trust signals

---

## Brand Colors

### Primary Palette

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Primary Green** | `#34B192` | `52, 177, 146` | Primary buttons, links, key actions, featured cards |
| **Accent Green** | `#66E088` | `102, 224, 136` | Highlights, gradients, success states |
| **Dark** | `#222121` | `34, 33, 33` | Headlines, primary text |
| **White** | `#FFFFFF` | `255, 255, 255` | Cards, light text |
| **Page Background** | `#F7F7F7` | `247, 247, 247` | Page backgrounds |
| **Card Background** | `#FFFFFF` | `255, 255, 255` | Card backgrounds |

### Extended Palette

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Primary | `#34B192` | `bg-[#34B192]` | Buttons, featured elements |
| Primary Hover | `#2D9A7E` | `hover:bg-[#2D9A7E]` | Button hover states |
| Primary Light | `rgba(52,177,146,0.1)` | `bg-[#34B192]/10` | Subtle backgrounds |
| Primary Ultra-Light | `rgba(52,177,146,0.05)` | `bg-[#34B192]/5` | Hover states |
| Accent | `#66E088` | `bg-[#66E088]` | Gradients, highlights |
| Text Primary | `#222121` | `text-[#222121]` | Headlines |
| Text Secondary | `rgba(34,33,33,0.7)` | `text-[#222121]/70` | Body text |
| Text Muted | `rgba(34,33,33,0.5)` | `text-[#222121]/50` | Captions, labels |
| Text Faint | `rgba(34,33,33,0.15)` | `text-[#222121]/15` | Watermark text |
| Border | `rgba(34,33,33,0.08)` | `border-[#222121]/8` | Card borders |
| Shadow | `rgba(0,0,0,0.04)` | `shadow-[0_2px_8px_rgba(0,0,0,0.04)]` | Card shadows |

### CSS Custom Properties

```css
:root {
  --hireflow-primary: #34B192;
  --hireflow-primary-hover: #2D9A7E;
  --hireflow-accent: #66E088;
  --hireflow-dark: #222121;
  --hireflow-white: #FFFFFF;
  --hireflow-page-bg: #F7F7F7;
  --hireflow-card-bg: #FFFFFF;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.04);
  --shadow-card-hover: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-button: 0 4px 12px rgba(52, 177, 146, 0.25);
}
```

### Tailwind Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        hireflow: {
          primary: '#34B192',
          'primary-hover': '#2D9A7E',
          accent: '#66E088',
          dark: '#222121',
        },
        page: '#F7F7F7',
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'button': '0 4px 12px rgba(52, 177, 146, 0.25)',
      }
    }
  }
}
```

---

## Typography

### Font Family

- **Primary:** Cal Sans (SemiBold) for headlines
- **Body:** Inter or system-ui for body text
- **Mono:** JetBrains Mono for code

### Font Installation

```css
@font-face {
  font-family: 'Cal Sans';
  src: url('/fonts/CalSans-SemiBold.woff2') format('woff2'),
       url('/fonts/CalSans-SemiBold.woff') format('woff');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

:root {
  --font-heading: 'Cal Sans', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

body {
  font-family: var(--font-body);
}
```

### Type Scale

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Hero Headline | 56-64px | 600 | `text-6xl font-semibold` |
| Section Headline | 40-48px | 600 | `text-5xl font-semibold` |
| Card Title | 24-28px | 600 | `text-2xl font-semibold` |
| Subheading | 18-20px | 500 | `text-lg font-medium` |
| Body Large | 18px | 400 | `text-lg` |
| Body | 16px | 400 | `text-base` |
| Body Small | 14px | 400 | `text-sm` |
| Caption | 12px | 500 | `text-xs font-medium` |
| Watermark | 200-300px | 600 | `text-[200px] font-semibold` |

### Headline Styling Pattern

Headlines often have mixed opacity for visual interest:

```tsx
// Faded words with bold emphasis
<h2 className="text-5xl font-semibold text-center">
  <span className="text-[#222121]/40">Partner with a team that</span>{' '}
  <span className="text-[#222121]">delivers results.</span>
</h2>

// Or alternating pattern
<h2 className="text-5xl font-semibold text-center">
  <span className="text-[#222121]/40">Scale your</span>{' '}
  <span className="text-[#222121]">recruitment pipeline.</span>
</h2>
```

---

## Page Layout

### Background Pattern

```tsx
// Page wrapper with light gray background
<div className="min-h-screen bg-[#F7F7F7]">
  {/* Content */}
</div>
```

### Large Watermark Text (Footer/Background)

```tsx
// Giant faded brand name in background
<div className="relative overflow-hidden">
  <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pointer-events-none select-none">
    <span className="text-[200px] md:text-[280px] font-semibold text-[#222121]/[0.03] leading-none tracking-tight">
      hireflow
    </span>
  </div>
  {/* Foreground content */}
</div>
```

### Section Spacing

```tsx
// Standard section
<section className="py-20 md:py-28">
  <div className="max-w-6xl mx-auto px-6">
    {/* Content */}
  </div>
</section>
```

---

## Components

### Section Pills (with dot indicator)

```tsx
// Section label pill
<div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
  <span className="size-2 rounded-full bg-[#34B192]" />
  Our Services
</div>

// Urgency pill variant
<div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2">
  <span className="size-2 rounded-full bg-[#34B192] animate-pulse" />
  <span className="text-sm font-medium text-[#34B192]">3 slots left</span>
  <span className="text-sm text-[#222121]/60">Launch in 2-3 weeks</span>
</div>
```

### Primary CTA Button (with avatar)

```tsx
// CTA with embedded avatar - signature style
<button className="group relative inline-flex items-center gap-3 rounded-2xl bg-[#34B192] px-6 py-4 text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)] hover:scale-[1.02]">
  <div className="size-10 overflow-hidden rounded-xl border-2 border-white/20">
    <img src="/avatar.jpg" alt="" className="size-full object-cover" />
  </div>
  <div className="text-left">
    <div className="font-semibold">Book an Intro Call</div>
    <div className="text-sm text-white/80">Let's talk about your pipeline</div>
  </div>
</button>

// Urgency text below CTA
<p className="mt-3 flex items-center justify-center gap-2 text-sm text-[#222121]/50">
  <span className="size-1.5 rounded-full bg-[#34B192]" />
  Be quick! Spots are almost gone for January
</p>
```

### Standard Buttons

```tsx
// Primary button (green, rounded-full)
<button className="h-12 rounded-full bg-[#34B192] px-8 text-sm font-semibold text-white shadow-button transition-all hover:bg-[#2D9A7E] hover:shadow-lg">
  Get Started
</button>

// Secondary button (white with border)
<button className="h-12 rounded-full border border-[#222121]/10 bg-white px-8 text-sm font-semibold text-[#222121] transition-all hover:border-[#222121]/20 hover:shadow-card">
  Learn More
</button>

// Ghost button with icon
<button className="inline-flex items-center gap-2 text-sm font-medium text-[#222121]/60 transition-colors hover:text-[#34B192]">
  <MailIcon className="size-4" />
  Reach out via email
</button>
```

### Cards - Standard

```tsx
// Basic card
<div className="rounded-2xl border border-[#222121]/8 bg-white p-6 shadow-card transition-all hover:shadow-card-hover">
  {/* Content */}
</div>

// Card with top badge
<div className="rounded-2xl border border-[#222121]/8 bg-white p-6 shadow-card">
  <span className="inline-block rounded-full bg-[#34B192]/10 px-3 py-1 text-xs font-semibold text-[#34B192]">
    Popular
  </span>
  <h3 className="mt-4 text-xl font-semibold text-[#222121]">Card Title</h3>
  <p className="mt-2 text-[#222121]/60">Card description goes here.</p>
</div>
```

### Pricing Cards (3-column with featured)

```tsx
// Standard pricing card
<div className="rounded-2xl border border-[#222121]/8 bg-white p-8 shadow-card">
  <span className="inline-block rounded-full bg-[#34B192]/10 px-3 py-1 text-xs font-semibold text-[#34B192]">
    Starter
  </span>
  <h3 className="mt-6 text-2xl font-semibold text-[#222121]">Lead Sprint</h3>
  <p className="mt-2 text-[#222121]/60">
    Quick-start lead generation for recruitment firms ready to grow.
  </p>

  <div className="mt-8">
    <p className="text-sm font-medium text-[#222121]/50">What's included:</p>
    <ul className="mt-4 space-y-3">
      <li className="flex items-start gap-3">
        <CheckIcon className="mt-0.5 size-5 text-[#34B192]" />
        <span className="text-sm text-[#222121]/70">50 qualified leads per month</span>
      </li>
      {/* More items */}
    </ul>
  </div>

  <button className="mt-8 w-full h-12 rounded-full bg-[#34B192] text-sm font-semibold text-white transition-all hover:bg-[#2D9A7E]">
    Launch in 7 Days
  </button>
</div>

// Featured pricing card (full green background)
<div className="rounded-2xl bg-[#34B192] p-8 shadow-[0_8px_32px_rgba(52,177,146,0.3)]">
  <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
    Most Popular
  </span>
  <h3 className="mt-6 text-2xl font-semibold text-white">Pipeline Pro</h3>
  <p className="mt-2 text-white/80">
    Full-service lead generation with dedicated support.
  </p>

  <button className="mt-6 w-full h-12 rounded-full bg-white text-sm font-semibold text-[#34B192] transition-all hover:bg-white/90">
    Scale Your Pipeline
  </button>

  <div className="mt-8">
    <p className="text-sm font-medium text-white/70">What's included:</p>
    <ul className="mt-4 space-y-3">
      <li className="flex items-start gap-3">
        <CheckIcon className="mt-0.5 size-5 text-white" />
        <span className="text-sm text-white/90">150 qualified leads per month</span>
      </li>
      {/* More items */}
    </ul>
  </div>
</div>
```

### Process Steps (numbered cards)

```tsx
<div className="grid md:grid-cols-3 gap-6">
  {/* Step 1 */}
  <div className="rounded-2xl border border-[#222121]/8 bg-white p-8 shadow-card">
    <span className="text-sm font-semibold text-[#34B192]">1-2 DAYS</span>

    {/* Visual/illustration area */}
    <div className="mt-6 aspect-[4/3] rounded-xl bg-[#F7F7F7] flex items-center justify-center">
      {/* Image or illustration */}
    </div>

    {/* Large step number */}
    <div className="mt-6 text-5xl font-semibold text-[#34B192]/20">1.</div>

    <h3 className="mt-2 text-xl font-semibold text-[#222121]">Discovery Call</h3>
    <p className="mt-2 text-[#222121]/60">
      We understand your ideal clients, sectors, and what success looks like.
    </p>
  </div>

  {/* Step 2, 3... */}
</div>
```

### Before/After Comparison

```tsx
<div className="grid md:grid-cols-2 gap-8 items-start">
  {/* Before */}
  <div className="relative">
    <span className="absolute -top-3 left-4 z-10 rounded-md border border-[#222121]/10 bg-white px-3 py-1 text-xs font-semibold text-[#222121]/60">
      Before
    </span>
    <div className="rounded-2xl border border-[#222121]/10 bg-white p-2 shadow-card">
      <img src="/before.jpg" className="rounded-xl" />
    </div>
  </div>

  {/* Arrow between */}
  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
    <svg className="size-12 text-[#34B192]" /* curved arrow */ />
  </div>

  {/* After */}
  <div className="relative">
    <span className="absolute -top-3 right-4 z-10 rounded-md bg-[#34B192] px-3 py-1 text-xs font-semibold text-white">
      After
    </span>
    <div className="rounded-2xl border-2 border-[#34B192]/30 bg-white p-2 shadow-card-hover">
      <img src="/after.jpg" className="rounded-xl" />
    </div>
  </div>
</div>
```

### FAQ Accordion

```tsx
<div className="space-y-3">
  {faqs.map((faq) => (
    <div
      key={faq.id}
      className="rounded-2xl border border-[#222121]/8 bg-white px-6 py-4 shadow-card transition-all hover:shadow-card-hover"
    >
      <button className="flex w-full items-center justify-between text-left">
        <span className="text-base font-medium text-[#222121]">{faq.question}</span>
        <ChevronDownIcon className="size-5 text-[#222121]/40 transition-transform ui-open:rotate-180" />
      </button>
      {/* Expanded content */}
      <div className="mt-4 text-[#222121]/60">
        {faq.answer}
      </div>
    </div>
  ))}
</div>
```

### Contact Card (sidebar style)

```tsx
<div className="rounded-2xl border border-[#222121]/8 bg-white p-6 shadow-card">
  <div className="flex items-center gap-3">
    <div className="size-12 overflow-hidden rounded-xl">
      <img src="/avatar.jpg" className="size-full object-cover" />
    </div>
    <div>
      <p className="font-medium text-[#222121]">Didn't find the answer?</p>
      <p className="text-sm text-[#222121]/60">Book a free discovery call!</p>
    </div>
  </div>

  <div className="mt-6 space-y-3">
    <button className="w-full h-11 rounded-full bg-[#34B192] text-sm font-semibold text-white transition-all hover:bg-[#2D9A7E]">
      Book an Intro Call
    </button>
    <button className="w-full h-11 rounded-full border border-[#222121]/10 bg-white text-sm font-medium text-[#222121] transition-all hover:border-[#222121]/20 flex items-center justify-center gap-2">
      <MailIcon className="size-4" />
      Reach out via email
    </button>
  </div>
</div>
```

### Feature Checklist

```tsx
<ul className="space-y-3">
  <li className="flex items-start gap-3">
    <div className="mt-0.5 flex size-5 items-center justify-center rounded bg-[#34B192]/10">
      <CheckIcon className="size-3.5 text-[#34B192]" />
    </div>
    <span className="text-sm text-[#222121]/70">Qualified recruitment company leads</span>
  </li>
  <li className="flex items-start gap-3">
    <div className="mt-0.5 flex size-5 items-center justify-center rounded bg-[#34B192]/10">
      <CheckIcon className="size-3.5 text-[#34B192]" />
    </div>
    <span className="text-sm text-[#222121]/70">Direct contact with decision makers</span>
  </li>
  {/* More items */}
</ul>

// White checkmarks on green cards
<ul className="space-y-3">
  <li className="flex items-start gap-3">
    <div className="mt-0.5 flex size-5 items-center justify-center rounded bg-white/20">
      <CheckIcon className="size-3.5 text-white" />
    </div>
    <span className="text-sm text-white/90">Qualified recruitment company leads</span>
  </li>
</ul>
```

### Stats/Metrics Display

```tsx
<div className="grid grid-cols-3 gap-8 py-12 border-y border-[#222121]/8">
  <div className="text-center">
    <div className="text-4xl font-semibold text-[#34B192]">500+</div>
    <div className="mt-1 text-sm text-[#222121]/50">Leads Generated</div>
  </div>
  <div className="text-center">
    <div className="text-4xl font-semibold text-[#222121]">47%</div>
    <div className="mt-1 text-sm text-[#222121]/50">Conversion Rate</div>
  </div>
  <div className="text-center">
    <div className="text-4xl font-semibold text-[#222121]">24hr</div>
    <div className="mt-1 text-sm text-[#222121]/50">Avg Response Time</div>
  </div>
</div>
```

---

## Logo Usage

### Logo Variants

| Variant | Usage |
|---------|-------|
| `Hireflow_-_Light_BG.svg` | White/light gray backgrounds |
| `Hireflow_-_Dark_BG.png` | Dark backgrounds, green backgrounds |
| `Hireflow_-_LogoMark.jpg` | Favicons, app icons, social avatars |

### Watermark Implementation

```tsx
// Large background watermark
<span className="text-[200px] md:text-[280px] font-semibold text-[#222121]/[0.03] leading-none tracking-tight lowercase">
  hireflow
</span>
```

---

## Spacing & Layout

| Context | Value | Class |
|---------|-------|-------|
| Section padding | 80-112px | `py-20 md:py-28` |
| Card padding | 24-32px | `p-6` or `p-8` |
| Card gap | 24px | `gap-6` |
| Component gap | 16-24px | `gap-4` or `gap-6` |
| Max content width | 1152px | `max-w-6xl` |
| Border radius (cards) | 16px | `rounded-2xl` |
| Border radius (buttons) | 9999px | `rounded-full` |
| Border radius (badges) | 9999px | `rounded-full` |

---

## Animation & Transitions

```css
/* Standard transition */
transition: all 0.2s ease;

/* Tailwind classes */
.transition-all
.duration-200
.ease-out

/* Hover scale for CTAs */
hover:scale-[1.02]

/* Shadow transitions */
shadow-card -> hover:shadow-card-hover
```

---

## Do's and Don'ts

### Do

- Use light gray (`#F7F7F7`) for page backgrounds
- Use white cards with subtle shadows
- Use large watermark text for brand reinforcement
- Include avatars in primary CTAs for trust
- Add urgency indicators ("3 slots left", "Almost gone")
- Use section pills with dot indicators
- Make featured cards full green background
- Use generous whitespace
- Keep borders very subtle (8% opacity)
- Mix faded and bold text in headlines

### Don't

- Use pure white page backgrounds (too harsh)
- Add heavy shadows or borders
- Use multiple accent colors
- Overcrowd sections with content
- Skip the section pill indicators
- Use small, timid buttons
- Forget the watermark brand element
- Use dark backgrounds for main sections
- Add unnecessary decorative elements

---

## Quick Reference

### Essential Classes

```
// Page
bg-[#F7F7F7]                    - Page background

// Cards
bg-white rounded-2xl border border-[#222121]/8 shadow-card

// Featured Card
bg-[#34B192] rounded-2xl shadow-[0_8px_32px_rgba(52,177,146,0.3)]

// Primary Button
h-12 rounded-full bg-[#34B192] text-white font-semibold hover:bg-[#2D9A7E]

// Section Pill
inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2

// Headlines
text-5xl font-semibold text-[#222121]

// Faded headline text
text-[#222121]/40

// Body text
text-[#222121]/60 or text-[#222121]/70

// Watermark
text-[200px] font-semibold text-[#222121]/[0.03]

// Checkmark icon bg
bg-[#34B192]/10 text-[#34B192]
```

---

## File Structure for Implementation

```
/public
  /fonts
    CalSans-SemiBold.woff2
    CalSans-SemiBold.woff
  /images
    hireflow-logo-light.svg
    hireflow-logo-dark.png
    hireflow-logomark.jpg
    avatar.jpg (for CTAs)

/src
  /styles
    globals.css (fonts, custom properties)
  /components
    /ui
      Button.tsx
      Card.tsx
      SectionPill.tsx
      PricingCard.tsx
      FAQAccordion.tsx
      ProcessStep.tsx
```

---

*Hireflow Style Guide v2.0*
*Updated: January 2026*
