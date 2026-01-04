# Content Creation Guide

Quick reference for adding blogs and practice tests to TechVault.

## Adding a New Blog Post

### Step 1: Create the file

```bash
src/content/blog/your-post-name.mdx
```

### Step 2: Add frontmatter

```mdx
---
title: "Your Amazing Blog Post Title"
description: "A compelling description that appears in search and previews"
pubDate: 2024-01-30
author: "Your Name"
category: "DevOps"
tags: ["docker", "kubernetes", "ci-cd"]
---
```

### Step 3: Write your content

Use standard Markdown, code blocks, tables, and HTML!

#### Example with code:

\`\`\`python
def deploy_app():
    print("Deploying to production!")
\`\`\`

#### Example with table:

| Tool | Purpose | Best For |
|------|---------|----------|
| Docker | Containerization | Packaging apps |
| K8s | Orchestration | Managing containers |

## Adding a Practice Test

### Step 1: Create the file

```bash
src/content/tests/your-test-name.mdx
```

### Step 2: Add frontmatter

```mdx
---
title: "AWS Certified Solutions Architect Practice Test"
description: "Comprehensive exam covering AWS services and architecture"
category: "Cloud"
difficulty: "Advanced"
timeLimit: 60
passingScore: 75
---
```

### Step 3: Write questions

**IMPORTANT**: Use this exact format!

```mdx
> What is AWS Lambda?
> - A database service
> - A storage service
> * A serverless compute service
> - A networking service

> Which service provides managed Kubernetes on AWS?
> - ECS
> * EKS
> - ECR
> - Fargate
```

**Rules:**
- Each question is a blockquote (starts with `>`)
- First line = question
- Options use `-` for wrong answers
- Options use `*` for correct answer
- EXACTLY ONE correct answer per question
- Avoid using HTML-like syntax (no `<variable>`, use VARIABLE instead)

## Categories

Choose one:
- **DevOps**: CI/CD, containers, IaC, automation
- **Cloud**: AWS, Azure, GCP, cloud architecture
- **AI**: ML, LLMs, data science, neural networks
- **Security**: Cybersecurity, encryption, compliance, IAM

## Difficulty Levels (Tests Only)

- **Beginner**: Fundamental concepts
- **Intermediate**: Practical applications
- **Advanced**: Complex scenarios and best practices

## Tips for Great Content

### Blog Posts
1. Start with a clear introduction
2. Use code examples that actually work
3. Include diagrams or tables where helpful
4. End with key takeaways or next steps
5. Keep paragraphs short and scannable

### Practice Tests
1. Write clear, unambiguous questions
2. Make all options plausible
3. Mix difficulty levels
4. Cover all important topics
5. Aim for 15-30 questions per test

## Testing Your Content

Run the dev server:
```bash
npm run dev
```

Build to check for errors:
```bash
npm run build
```

## Common Mistakes to Avoid

❌ Using HTML-like syntax in questions: `<variable-name>`
✅ Use: `VARIABLE_NAME` or `variable-name`

❌ Multiple correct answers marked with `*`
✅ Only ONE answer should have `*`

❌ Wrong category spelling
✅ Use exact: DevOps, Cloud, AI, Security

❌ Missing frontmatter fields
✅ Include all required fields

## Need Help?

Check the sample posts:
- `src/content/blog/kubernetes-best-practices.mdx`
- `src/content/blog/aws-security-fundamentals.mdx`
- `src/content/tests/kubernetes-fundamentals.mdx`

Happy creating! 🚀
