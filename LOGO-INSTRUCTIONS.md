# Logo Installation Instructions

## Quick Steps

To complete the CloudNative Atlas rebranding, you need to add the logo image:

1. **Save the logo image** (the one provided in the conversation) as `logo.png`

2. **Place it in the public folder**:
   ```
   techvault-blog/public/logo.png
   ```

3. **Recommended logo specifications**:
   - Format: PNG with transparent background
   - Dimensions: 800x800px or similar (will be displayed at 40px height)
   - The logo shows the CloudNative Atlas branding with:
     - Compass/navigation design
     - Circuit board cloud pattern
     - Shield with DevOps, Cloud, AI, and Security icons
     - Text: "CloudNative Atlas" (cyan and orange)

4. **After placing the logo**, rebuild the site:
   ```bash
   npm run build
   ```

## Alternative: Quick Logo Placement

If you have the logo image file saved on your computer:

1. Copy the logo file
2. Navigate to: `C:\Users\Administrator\Documents\techvault-web\techvault-blog\public\`
3. Paste and rename it to `logo.png`
4. Run: `npm run build`

## What's Already Updated

All text references have been changed from "TechVault" to "CloudNative Atlas":
- Navigation component
- Footer component
- Layout component (meta tags, descriptions)
- Homepage
- Blog page
- Practice Tests page
- Astro config (site URL)

The logo is referenced in `src/components/Navigation.astro` at line 13 as:
```html
<img src="/logo.png" alt="CloudNative Atlas" class="logo-image" />
```

## Verify the Logo

After adding the logo and rebuilding:
1. Start the dev server: `npm run dev`
2. Open http://localhost:4321
3. Check that the logo appears in the navigation bar
4. The logo should have a cyan glow effect on hover

If the logo doesn't appear, check:
- File is named exactly `logo.png` (case-sensitive on some systems)
- File is in the `public` folder, not `src`
- Browser cache - try hard refresh (Ctrl+F5)
