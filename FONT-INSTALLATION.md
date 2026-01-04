# Congenial UltraLight Font Installation Guide

## Overview

The CloudNative Atlas website now uses **Congenial UltraLight** as its primary font. This guide explains how to install the font files.

## Required Font Files

You need to obtain the Congenial UltraLight font in the following formats:

1. **Congenial-UltraLight.woff2** (preferred - smallest file size, best performance)
2. **Congenial-UltraLight.woff** (fallback for older browsers)
3. **Congenial-UltraLight.ttf** (fallback for very old browsers)

## Installation Steps

### Step 1: Obtain the Font Files

**Option A: If you have the font files**
- Ensure you have the Congenial UltraLight font in WOFF2, WOFF, or TTF format

**Option B: Convert from other formats**
- If you have Congenial UltraLight in OTF or TTF format only, use a font converter:
  - Online: https://cloudconvert.com/ttf-to-woff2
  - Online: https://www.fontsquirrel.com/tools/webfont-generator

### Step 2: Place Font Files

Copy your font files to the following directory:
```
techvault-blog/public/fonts/
```

Your file structure should look like:
```
techvault-blog/
├── public/
│   ├── fonts/
│   │   ├── Congenial-UltraLight.woff2
│   │   ├── Congenial-UltraLight.woff
│   │   └── Congenial-UltraLight.ttf
│   ├── logo.png
│   └── favicon.svg
```

### Step 3: Verify Font Files

Make sure the files are named exactly:
- `Congenial-UltraLight.woff2`
- `Congenial-UltraLight.woff`
- `Congenial-UltraLight.ttf`

**Note**: File names are case-sensitive on some systems!

### Step 4: Build and Test

```bash
# Build the site
npm run build

# Test locally
npm run dev
```

Visit http://localhost:4321 and verify the font is loading.

## Font Configuration

The font has already been configured in the following files:

### Global CSS (`src/styles/global.css`)
```css
@font-face {
  font-family: 'Congenial';
  src: url('/fonts/Congenial-UltraLight.woff2') format('woff2'),
       url('/fonts/Congenial-UltraLight.woff') format('woff'),
       url('/fonts/Congenial-UltraLight.ttf') format('truetype');
  font-weight: 200;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'Congenial', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  font-weight: 200;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Congenial', 'Inter', sans-serif;
  font-weight: 200;
}
```

### Fallback Chain

If Congenial UltraLight doesn't load, the site will fall back to:
1. Inter (system font)
2. System default fonts (-apple-system, BlinkMacSystemFont, etc.)

This ensures the site always displays properly even if the custom font fails to load.

## Troubleshooting

### Font Not Loading?

**Check Browser Developer Tools:**
1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "Font"
4. Reload the page
5. Look for Congenial-UltraLight files
6. Check for any 404 errors

**Common Issues:**

1. **404 Error - File Not Found**
   - Verify files are in `public/fonts/` folder
   - Check file names match exactly (case-sensitive)
   - Make sure you rebuilt after adding fonts

2. **Font Shows But Looks Different**
   - Ensure you have the **UltraLight** weight (font-weight: 200)
   - Check you didn't accidentally use Regular or Bold weight

3. **CORS Error**
   - This shouldn't happen with local fonts
   - If deploying, ensure fonts are uploaded to server

4. **Font Flashing**
   - This is normal during development
   - The `font-display: swap` causes brief flash
   - In production with caching, this won't be noticeable

### Browser Compatibility Check

Test in:
- ✓ Chrome/Edge (WOFF2)
- ✓ Firefox (WOFF2)
- ✓ Safari (WOFF2 or WOFF)
- ✓ Internet Explorer 11 (WOFF)
- ✓ Older browsers (TTF)

## Font License

**Important**: Ensure you have the proper license for using Congenial UltraLight on a website.

- Commercial use may require a license
- Check with the font foundry
- Include license file if required

## Alternative: Using a Similar Free Font

If you cannot obtain Congenial UltraLight, here are similar alternatives:

### Option 1: Raleway Thin (Free from Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Raleway:wght@100;200;300&display=swap" rel="stylesheet">
```
```css
body {
  font-family: 'Raleway', sans-serif;
  font-weight: 200;
}
```

### Option 2: Roboto Thin (Free from Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300&display=swap" rel="stylesheet">
```
```css
body {
  font-family: 'Roboto', sans-serif;
  font-weight: 100;
}
```

### Option 3: Work Sans ExtraLight (Free from Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@200;300&display=swap" rel="stylesheet">
```
```css
body {
  font-family: 'Work Sans', sans-serif;
  font-weight: 200;
}
```

To use an alternative font, update `src/styles/global.css` and `src/layouts/Layout.astro`.

## Performance Considerations

### Font Loading Strategy

The current configuration uses `font-display: swap`:
- Text displays immediately in fallback font
- Custom font swaps in when loaded
- Prevents invisible text (FOIT)
- Better for performance

### File Size Optimization

**WOFF2 is the smallest:**
- WOFF2: ~15-30KB (recommended)
- WOFF: ~20-40KB
- TTF: ~40-80KB

Only include formats you need. Modern browsers only need WOFF2.

### Minimize Font Reflow

Since Congenial UltraLight (font-weight: 200) is very thin, there may be layout shift when it loads. To minimize:

1. The fallback chain includes similar system fonts
2. Font-weight is set to 200 for both custom and fallback fonts
3. Line-height is optimized in global.css

## Deployment

When deploying to production:

1. **Ensure fonts are uploaded:**
   - Copy `public/fonts/` to your web server
   - Verify files are accessible at `/fonts/Congenial-UltraLight.*`

2. **Set proper caching headers:**
   ```apache
   # .htaccess
   <FilesMatch "\.(woff2|woff|ttf)$">
     Header set Cache-Control "max-age=31536000, public"
   </FilesMatch>
   ```

3. **Verify on production:**
   - Visit your live site
   - Check Network tab for font loading
   - Test on multiple devices

## Quick Checklist

- [ ] Obtain Congenial UltraLight font files
- [ ] Convert to WOFF2, WOFF, and TTF formats
- [ ] Place files in `public/fonts/` directory
- [ ] Verify file names match exactly
- [ ] Run `npm run build`
- [ ] Test locally with `npm run dev`
- [ ] Check font loads in browser DevTools
- [ ] Upload fonts to production server
- [ ] Verify font on live site

---

**Status**: Font configuration is complete. Just add the font files!

**Need Help?** Check browser DevTools Network tab to debug font loading issues.
