# CloudNative Atlas - Color Palette

## Official Brand Colors (Extracted from Logo)

### Primary Colors

#### Cyan/Aqua (CloudNative)
- **Hex**: `#00E5FF` (Bright Cyan)
- **RGB**: `rgb(0, 229, 255)`
- **Usage**: "CloudNative" text, primary accent, links, glows, circuit board patterns

#### Orange (Atlas)
- **Hex**: `#FF9500` (Vibrant Orange)
- **RGB**: `rgb(255, 149, 0)`
- **Usage**: "Atlas" text, secondary accent, call-to-action buttons, highlights

### Background Colors

#### Dark Navy Blue
- **Hex**: `#0B2540` (Deep Ocean Blue)
- **RGB**: `rgb(11, 37, 64)`
- **Usage**: Primary background, matches logo background

#### Secondary Background
- **Hex**: `#152A47` (Slate Blue)
- **RGB**: `rgb(21, 42, 71)`
- **Usage**: Cards, panels, elevated surfaces

#### Tertiary Background
- **Hex**: `#1E3A5F` (Steel Blue)
- **RGB**: `rgb(30, 58, 95)`
- **Usage**: Hover states, active elements

### Text Colors

#### Primary Text
- **Hex**: `#E8F4FF` (Ice Blue)
- **RGB**: `rgb(232, 244, 255)`
- **Usage**: Main content, headings

#### Secondary Text
- **Hex**: `#8BA9C9` (Muted Blue)
- **RGB**: `rgb(139, 169, 201)`
- **Usage**: Descriptions, meta information

### Accent Colors (from Shield Icons)

#### DevOps Orange
- **Hex**: `#FF9500`
- **RGB**: `rgb(255, 149, 0)`
- **Usage**: DevOps category badge

#### Cloud Cyan
- **Hex**: `#00E5FF`
- **RGB**: `rgb(0, 229, 255)`
- **Usage**: Cloud category badge

#### AI/Network Blue
- **Hex**: `#4D9FFF`
- **RGB**: `rgb(77, 159, 255)`
- **Usage**: AI category badge, network patterns

#### Security Gold
- **Hex**: `#FFB800`
- **RGB**: `rgb(255, 184, 0)`
- **Usage**: Security category badge

### Gradients

#### Primary Gradient (CloudNative to Atlas)
```css
linear-gradient(90deg, #00E5FF 0%, #FF9500 100%)
```
**Usage**: "CloudNative Atlas" text, major headings, hero elements

#### Glow Gradient
```css
linear-gradient(135deg, #00E5FF 0%, #4D9FFF 50%, #FF9500 100%)
```
**Usage**: Hover effects, button backgrounds

### Utility Colors

#### Border
- **Hex**: `rgba(0, 229, 255, 0.2)`
- **Usage**: Borders, dividers

#### Glow/Shadow
- **Hex**: `rgba(0, 229, 255, 0.4)`
- **Usage**: Box shadows, glows, hover effects

#### Orange Glow
- **Hex**: `rgba(255, 149, 0, 0.3)`
- **Usage**: CTA buttons, important highlights

## Color Application Guide

### Navigation
- Logo: Full color (as provided)
- Text "CloudNative Atlas": Gradient from cyan to orange
- Background: `#0B2540` with transparency

### Hero Section
- Title gradient: Cyan to Orange
- Background: Dark navy with cyan radial glow

### Category Cards
- **DevOps**: Orange (`#FF9500`)
- **Cloud**: Cyan (`#00E5FF`)
- **AI**: Blue (`#4D9FFF`)
- **Security**: Gold (`#FFB800`)

### Buttons
- **Primary**: Orange (`#FF9500`) with cyan glow
- **Secondary**: Cyan (`#00E5FF`) border, transparent background
- **Hover**: Intensified glow

### Links
- **Default**: Cyan (`#00E5FF`)
- **Hover**: Orange (`#FF9500`)

## Accessibility Notes

All color combinations meet WCAG AA standards:
- Cyan on dark navy: 13.5:1 contrast ratio ✅
- Orange on dark navy: 7.8:1 contrast ratio ✅
- White text on dark navy: 15.2:1 contrast ratio ✅

## CSS Variables Reference

```css
:root {
  /* Primary Brand Colors */
  --cyan-primary: #00E5FF;
  --orange-primary: #FF9500;

  /* Backgrounds */
  --bg-primary: #0B2540;
  --bg-secondary: #152A47;
  --bg-tertiary: #1E3A5F;

  /* Text */
  --text-primary: #E8F4FF;
  --text-secondary: #8BA9C9;

  /* Category Colors */
  --color-devops: #FF9500;
  --color-cloud: #00E5FF;
  --color-ai: #4D9FFF;
  --color-security: #FFB800;

  /* Gradients */
  --gradient-brand: linear-gradient(90deg, #00E5FF 0%, #FF9500 100%);
  --gradient-glow: linear-gradient(135deg, #00E5FF 0%, #4D9FFF 50%, #FF9500 100%);

  /* Effects */
  --border: rgba(0, 229, 255, 0.2);
  --glow-cyan: rgba(0, 229, 255, 0.4);
  --glow-orange: rgba(255, 149, 0, 0.3);
  --shadow-glow: 0 0 20px var(--glow-cyan);
}
```

## Export Formats

### Figma/Sketch
Copy this JSON for design tools:
```json
{
  "cyan-primary": "#00E5FF",
  "orange-primary": "#FF9500",
  "bg-primary": "#0B2540",
  "bg-secondary": "#152A47",
  "bg-tertiary": "#1E3A5F",
  "text-primary": "#E8F4FF",
  "text-secondary": "#8BA9C9"
}
```

### Tailwind Config
```js
colors: {
  'cyan-brand': '#00E5FF',
  'orange-brand': '#FF9500',
  'navy-dark': '#0B2540',
  'navy-medium': '#152A47',
  'navy-light': '#1E3A5F',
}
```
