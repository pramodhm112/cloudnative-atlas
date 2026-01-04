# TechVault Blog

A futuristic, modern blog website focused on DevOps, Cloud, AI, and Security built with Astro and TypeScript.

## Features

- **Modern Design**: Futuristic UI with gradient themes, glass morphism effects, and smooth animations
- **MDX Support**: Write blog posts and practice tests in Markdown with embedded components
- **Content Collections**: Type-safe content management with Astro's content collections
- **Search Functionality**: Real-time search across all blog posts
- **Practice Tests**: Interactive multiple-choice exams with timer and scoring
- **Category Filtering**: Browse content by DevOps, Cloud, AI, or Security
- **Responsive Design**: Fully responsive across all devices
- **SEO Optimized**: Meta tags, semantic HTML, and optimized structure

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
cd techvault-blog
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:4321` to see your site.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
techvault-blog/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Navigation.astro
│   │   ├── Footer.astro
│   │   └── Search.astro
│   ├── content/          # Content collections
│   │   ├── blog/        # Blog posts (MDX)
│   │   ├── tests/       # Practice tests (MDX)
│   │   └── config.ts    # Content schema definitions
│   ├── layouts/         # Page layouts
│   │   └── Layout.astro
│   ├── pages/           # Route pages
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   ├── practice-tests/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── api/
│   │       └── posts.json.ts
│   └── styles/
│       └── global.css
├── astro.config.mjs
├── package.json
└── README.md
```

## Adding New Blog Posts

### 1. Create a New MDX File

Create a file in `src/content/blog/` with a `.mdx` extension:

```bash
src/content/blog/my-new-post.mdx
```

### 2. Add Frontmatter

Every blog post requires frontmatter at the top:

```mdx
---
title: "Your Post Title"
description: "A brief description of your post"
pubDate: 2024-01-30
author: "Your Name"
category: "DevOps"  # Must be: DevOps, Cloud, AI, or Security
tags: ["tag1", "tag2", "tag3"]
image: "/images/post-image.jpg"  # Optional
---

# Your Post Content

Start writing your post here...
```

### 3. Write Content in Markdown

You can use all standard Markdown features plus HTML.

## Adding Practice Tests

### 1. Create Test File

Create a file in `src/content/tests/`:

```bash
src/content/tests/my-test.mdx
```

### 2. Add Test Frontmatter

```mdx
---
title: "AWS Solutions Architect Practice Exam"
description: "Test your AWS knowledge with this comprehensive exam"
category: "Cloud"  # DevOps, Cloud, AI, or Security
difficulty: "Intermediate"  # Beginner, Intermediate, or Advanced
timeLimit: 45  # Time in minutes (optional)
passingScore: 70  # Percentage required to pass
---
```

### 3. Write Questions

Questions are written in blockquotes with specific formatting:

```mdx
> What is the main benefit of using Auto Scaling?
> - Reduces costs by stopping instances
> - Improves security
> * Automatically adjusts capacity based on demand
> - Simplifies deployment
```

**Format Rules:**
- Each question starts with a `>` blockquote
- First line is the question
- Following lines are options (use `-` for incorrect, `*` for correct)
- **Exactly one option must be marked correct** with `*`

## Content Categories

All content must use one of these categories:

- **DevOps**: CI/CD, containers, orchestration, infrastructure as code
- **Cloud**: AWS, Azure, GCP, cloud architecture
- **AI**: Machine learning, LLMs, data science
- **Security**: Cybersecurity, encryption, compliance

## Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |

## Deployment

See **[PRODUCTION-GUIDE.md](./PRODUCTION-GUIDE.md)** for comprehensive deployment instructions.

### Quick Deploy to Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

### Other Options
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Cloudflare Pages

Full instructions in `PRODUCTION-GUIDE.md`

## Customization

### Changing Colors

Edit `src/styles/global.css`:

```css
:root {
  --primary: #your-color;
  --secondary: #your-color;
}
```

### Modifying Navigation

Edit `src/components/Navigation.astro` to add/remove menu items.

## License

MIT License - feel free to use this template for your own projects!
