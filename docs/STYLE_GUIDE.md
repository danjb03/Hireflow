# Hireflow Style Guide

This document defines all styling conventions used in the Hireflow codebase. Reference this when building new components or pages.

---

## Design System: Glassmorphism

Hireflow uses a modern **glassmorphism design system** with:
- Frosted glass effects (backdrop-blur)
- Vibrant gradients
- Smooth animations
- Subtle shadows with glow effects

---

## Colors

### CSS Variables (defined in `src/index.css`)

All colors use HSL format via CSS variables:

```css
/* Primary - Hireflow Green */
--primary: 145 70% 55%;
--primary-foreground: 0 0% 100%;

/* Secondary - Navy Blue */
--secondary: 215 50% 23%;
--secondary-foreground: 0 0% 100%;

/* Semantic Colors */
--success: 142 76% 36%;        /* Green */
--warning: 38 92% 50%;         /* Amber */
--info: 217 91% 60%;           /* Blue */
--destructive: 0 84% 60%;      /* Red */

/* Neutrals */
--background: 220 25% 97%;
--foreground: 224 71% 4%;
--muted: 220 14% 96%;
--muted-foreground: 220 9% 46%;
--accent: 215 25% 40%;

/* Component Colors */
--card: 0 0% 100% / 0.7;       /* Glass effect */
--border: 220 13% 91%;
--input: 220 13% 91%;
--ring: var(--primary);
```

### Tailwind Usage

```tsx
// Primary actions
className="bg-primary text-primary-foreground"
className="text-primary"
className="border-primary"

// Semantic feedback
className="bg-success text-success-foreground"
className="bg-destructive text-destructive-foreground"
className="bg-warning text-warning-foreground"
className="bg-info text-info-foreground"

// Neutrals
className="bg-background"
className="text-foreground"
className="text-muted-foreground"
className="bg-muted"
className="border-border"
```

### Status Badge Colors

```tsx
// Client status badges
const statusColors = {
  happy: "bg-success/10 text-success border-success/20",
  unhappy: "bg-destructive/10 text-destructive border-destructive/20",
  urgent: "bg-destructive/20 text-destructive border-destructive/40 font-bold",
  at_risk: "bg-warning/10 text-warning border-warning/20",
  on_track: "bg-info/10 text-info border-info/20"
};

// Lead status badges
const leadStatusColors = {
  New: "bg-blue-100 text-blue-700",
  Lead: "bg-purple-100 text-purple-700",
  Approved: "bg-emerald-100 text-emerald-700",
  'Needs Work': "bg-yellow-100 text-yellow-700",
  Rejected: "bg-red-100 text-red-700"
};

// Notification badges
className="bg-emerald-100 text-emerald-700"  // On/Enabled
className="bg-slate-100 text-slate-600"      // Off/Disabled
```

### Gradient Patterns

```tsx
// Primary gradient (buttons, headers)
className="bg-gradient-to-r from-primary to-primary/90"

// Card accent gradients
className="bg-gradient-to-t from-primary/5 to-card"
className="bg-gradient-to-t from-blue-500/10 to-card"
className="bg-gradient-to-t from-emerald-500/10 to-card"

// Hero/landing gradients
className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"

// Text gradients
className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent"
```

---

## Typography

### Font Family

Primary font: **Inter** (imported from Google Fonts)

### Heading Sizes

```tsx
// Page title
className="text-2xl font-bold tracking-tight"

// Large hero (landing)
className="text-4xl md:text-6xl lg:text-7xl font-bold"

// Card title
className="text-xl font-semibold leading-none tracking-tight"
className="text-lg font-semibold"

// Section title
className="text-base font-semibold"
```

### Body Text

```tsx
// Default body
className="text-sm"

// Description/subtitle
className="text-sm text-muted-foreground"
className="text-sm text-muted-foreground mt-1"

// Caption
className="text-xs text-muted-foreground"
```

### Labels

```tsx
// Uppercase labels (cards, stats)
className="text-xs font-medium text-muted-foreground uppercase tracking-wide"

// Form labels
className="text-sm font-medium"
```

### Numbers & Stats

```tsx
// Large stat numbers
className="text-3xl md:text-4xl font-bold tabular-nums"
className="text-2xl font-bold tabular-nums"
```

---

## Components

### Buttons (`src/components/ui/button.tsx`)

**Variants:**
- `default` - Green gradient (primary actions)
- `secondary` - Navy gradient
- `outline` - Border + glass effect
- `ghost` - Minimal hover
- `destructive` - Red gradient
- `glass` - Glassmorphic
- `success` - Green

**Sizes:**
- `sm` - h-9 px-3.5 text-xs
- `default` - h-11 px-5 py-2.5
- `lg` - h-12 px-8 text-base
- `xl` - h-14 px-10 text-lg
- `icon` - h-10 w-10 (square)

### Cards (`src/components/ui/card.tsx`)

**Variants:**
- `default` - Glass effect
- `glass` - Lighter glass
- `solid` - Standard opaque
- `elevated` - Stronger shadow

**Hover:**
- `none`, `lift`, `glow`, `scale`

**Stats card pattern:**
```tsx
<Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
  <CardContent className="p-6">
    <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
      Label
    </CardDescription>
    <CardTitle className="text-2xl font-bold tabular-nums">
      {value}
    </CardTitle>
  </CardContent>
</Card>
```

### Badges (`src/components/ui/badge.tsx`)

**Variants:** `default`, `secondary`, `success`, `warning`, `destructive`, `info`, `outline`, `glass`

**Sizes:** `sm`, `default`, `lg`

---

## Spacing

### Page Layout
```tsx
className="space-y-6"      // Page sections
className="p-4 md:p-6"     // Page padding
```

### Grid Patterns
```tsx
// Stats cards
className="grid grid-cols-2 gap-4 md:grid-cols-4"

// Feature grid
className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
```

### Card Content
```tsx
className="p-6"   // Standard
className="p-5"   // Compact
```

---

## Effects

### Glass Effects
```tsx
className="bg-white/70 backdrop-blur-xl border border-white/20"
```

### Shadows
```tsx
className="shadow-sm"   // Cards
className="shadow-[0_4px_14px_-3px_hsl(var(--primary)/0.4)]"  // Button glow
```

### Border Radius
```tsx
className="rounded-xl"   // DEFAULT (most components)
className="rounded-2xl"  // Large cards
className="rounded-full" // Badges, avatars
```

---

## Icons

**Library:** `lucide-react` (ONLY)

```tsx
import { Icon } from "lucide-react";

<Icon className="h-4 w-4" />           // Standard
<Icon className="h-4 w-4 mr-2" />      // In buttons
<Icon className="h-5 w-5 text-primary" /> // Colored
```

---

## What's NOT Used

- CSS Modules
- Styled Components
- Custom CSS files (except index.css)
- Icon libraries other than lucide-react
- Custom fonts beyond Inter
- Inline styles

---

## Reference Files

- **Tailwind config:** `tailwind.config.ts`
- **CSS variables:** `src/index.css`
- **Example page:** `src/pages/AdminDashboard.tsx`
- **Landing styles:** `src/components/landing/HeroSection.tsx`
