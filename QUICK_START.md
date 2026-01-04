# TechVault Blog - Quick Start

## 🎉 Your Blog is Ready!

The development server is running at: **http://localhost:4321**

## What You Have

✅ **Futuristic Design** - Cyber-themed with gradients and animations
✅ **Blog System** - 3 sample posts (DevOps, Cloud, AI)
✅ **Practice Tests** - Interactive MCQ exam with timer
✅ **Search Feature** - Real-time blog post search
✅ **Responsive** - Works on all devices
✅ **Navigation & Footer** - Consistent across all pages

## Quick Actions

### View Your Site
```bash
# Already running at http://localhost:4321
# Visit in your browser
```

### Stop the Server
```bash
Ctrl + C
```

### Restart the Server
```bash
npm run dev
```

### Add Your First Blog Post

1. Create file: `src/content/blog/my-first-post.mdx`

2. Add this content:
```mdx
---
title: "My First Post"
description: "This is my first blog post"
pubDate: 2024-01-30
author: "Your Name"
category: "DevOps"
tags: ["beginner", "tutorial"]
---

# Hello World!

This is my first blog post on TechVault.

## Code Example

\`\`\`javascript
console.log("Hello, TechVault!");
\`\`\`

## What's Next?

- Learn more about DevOps
- Explore cloud technologies
- Build amazing things!
```

3. Save and refresh your browser - it appears automatically!

### Add Your First Practice Test

1. Create file: `src/content/tests/my-first-test.mdx`

2. Add this content:
```mdx
---
title: "Docker Basics Quiz"
description: "Test your Docker knowledge"
category: "DevOps"
difficulty: "Beginner"
timeLimit: 15
passingScore: 70
---

> What does Docker containerize?
> - Virtual machines
> * Applications and their dependencies
> - Operating systems
> - Network configurations

> Which command builds a Docker image?
> - docker run
> * docker build
> - docker create
> - docker start
```

3. Save and visit the Practice Tests page!

## Directory Structure

```
src/content/
├── blog/          ← Add blog posts here (.mdx files)
└── tests/         ← Add practice tests here (.mdx files)
```

## Categories

Use these exact values:
- `DevOps`
- `Cloud`
- `AI`
- `Security`

## Need Help?

📖 **Detailed Guide**: See `README.md`
📝 **Content Guide**: See `CONTENT_GUIDE.md`
📂 **Examples**: Check `src/content/blog/` and `src/content/tests/`

## Deployment

When ready to deploy:

```bash
npm run build
```

Then upload the `dist/` folder to:
- Netlify
- Vercel
- GitHub Pages
- Any static host

## Customization

### Change Colors
Edit `src/styles/global.css` - look for `:root` variables

### Modify Navigation
Edit `src/components/Navigation.astro`

### Update Footer
Edit `src/components/Footer.astro`

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

---

**Happy Blogging! 🚀**

Start by visiting http://localhost:4321 in your browser!
