#!/usr/bin/env node
/**
 * Generate N blog posts per category for scalability testing.
 * Usage: node scripts/generate-blog-posts.mjs
 *
 * Creates 20 posts per category (AI, DevOps, Cloud, Security) = 80 posts.
 * Each file is a valid MDX with frontmatter matching src/content/config.ts blog schema.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.resolve(__dirname, '..', 'src', 'content', 'blog');

// Topic pools — each category gets 20 diverse titles
const TOPICS = {
  DevOps: [
    ['Docker Containers Explained', 'Deep dive into Docker fundamentals and container lifecycle management', ['docker', 'containers', 'basics']],
    ['Kubernetes Pods 101', 'Understanding the smallest deployable unit in Kubernetes', ['kubernetes', 'pods', 'orchestration']],
    ['Helm Chart Authoring Guide', 'Package, version, and deploy Kubernetes apps with Helm', ['helm', 'kubernetes', 'packaging']],
    ['GitOps with ArgoCD', 'Declarative continuous delivery for Kubernetes using Git as source of truth', ['gitops', 'argocd', 'cd']],
    ['CI/CD Pipeline Patterns', 'Proven patterns for reliable, fast build and deploy pipelines', ['cicd', 'pipelines', 'automation']],
    ['Jenkins Shared Libraries', 'Reuse pipeline code across teams with Jenkins shared libraries', ['jenkins', 'ci', 'groovy']],
    ['GitHub Actions Matrix Builds', 'Run jobs across OS and runtime versions efficiently', ['github-actions', 'ci', 'matrix']],
    ['Terraform Modules Best Practices', 'Structuring reusable IaC with proper module boundaries', ['terraform', 'iac', 'modules']],
    ['Ansible Playbook Design', 'Writing idempotent, readable Ansible automation', ['ansible', 'config-mgmt', 'playbooks']],
    ['Prometheus Monitoring Setup', 'Collecting metrics at scale with Prometheus', ['prometheus', 'monitoring', 'metrics']],
    ['Grafana Dashboard Tips', 'Designing dashboards that surface signal, not noise', ['grafana', 'dashboards', 'observability']],
    ['ELK Stack for Log Aggregation', 'Centralized logging with Elasticsearch, Logstash, and Kibana', ['elk', 'logging', 'observability']],
    ['Service Mesh Introduction', 'Why and when you actually need a service mesh', ['service-mesh', 'networking', 'microservices']],
    ['Istio Traffic Management', 'Canary releases and traffic splitting with Istio', ['istio', 'service-mesh', 'traffic']],
    ['ArgoCD Multi-Cluster Setup', 'Managing multiple Kubernetes clusters from one ArgoCD instance', ['argocd', 'gitops', 'multi-cluster']],
    ['Kustomize Overlay Strategy', 'Environment-specific configuration without templating', ['kustomize', 'kubernetes', 'config']],
    ['Docker Compose for Dev', 'Local multi-service development workflows', ['docker-compose', 'development', 'containers']],
    ['Container Image Hardening', 'Shrinking images and eliminating CVEs', ['containers', 'security', 'images']],
    ['Microservices Communication', 'Sync vs async messaging patterns for distributed systems', ['microservices', 'architecture', 'patterns']],
    ['Blue-Green Deployment', 'Zero-downtime releases with parallel environments', ['deployment', 'release', 'bluegreen']],
  ],
  Cloud: [
    ['AWS Getting Started Guide', 'Foundational concepts for new AWS users', ['aws', 'basics', 'cloud']],
    ['EC2 Instance Selection', 'Picking the right instance family for your workload', ['aws', 'ec2', 'compute']],
    ['S3 Storage Classes Explained', 'Choosing the right storage tier for cost and latency', ['aws', 's3', 'storage']],
    ['RDS Multi-AZ Deployments', 'High availability for relational databases on AWS', ['aws', 'rds', 'database']],
    ['AWS Lambda Cold Starts', 'Understanding and mitigating serverless cold-start latency', ['aws', 'lambda', 'serverless']],
    ['API Gateway Patterns', 'REST, HTTP, and WebSocket API patterns on AWS', ['aws', 'api-gateway', 'api']],
    ['VPC Networking Deep Dive', 'Subnets, route tables, and network ACLs explained', ['aws', 'vpc', 'networking']],
    ['IAM Policies Explained', 'Principle of least privilege in AWS identity management', ['aws', 'iam', 'security']],
    ['CloudFormation vs CDK', 'Declarative vs programmatic infrastructure on AWS', ['aws', 'iac', 'cdk']],
    ['Azure Fundamentals', 'Core Azure services every developer should know', ['azure', 'basics', 'cloud']],
    ['Azure App Service Tips', 'Optimizing deployment and scaling on App Service', ['azure', 'app-service', 'paas']],
    ['Azure Functions Cold Starts', 'Strategies to reduce function startup time', ['azure', 'functions', 'serverless']],
    ['Google Cloud Platform Intro', 'GCP fundamentals for developers from AWS or Azure', ['gcp', 'basics', 'cloud']],
    ['Compute Engine vs GKE', 'Choosing between VMs and managed Kubernetes on GCP', ['gcp', 'compute', 'kubernetes']],
    ['Cloud Storage Lifecycle', 'Automated data tiering and archival on GCS', ['gcp', 'storage', 'lifecycle']],
    ['Serverless Architecture Patterns', 'Event-driven patterns that scale to zero', ['serverless', 'architecture', 'events']],
    ['Cloud Cost Optimization', 'Identifying and cutting cloud waste systematically', ['cloud', 'cost', 'finops']],
    ['Multi-Cloud Strategy', 'When multi-cloud makes sense and when it doesnt', ['cloud', 'multi-cloud', 'strategy']],
    ['Cloud Networking Basics', 'VPC peering, transit gateways, and interconnects', ['cloud', 'networking', 'basics']],
    ['Hybrid Cloud Design', 'Bridging on-prem and cloud for compliance and latency', ['cloud', 'hybrid', 'architecture']],
  ],
  AI: [
    ['Introduction to LLMs', 'Large language models from tokens to transformers', ['llm', 'ai', 'basics']],
    ['Prompt Engineering Techniques', 'Systematic approaches to better LLM outputs', ['prompts', 'llm', 'ai']],
    ['Fine-Tuning vs RAG', 'When to fine-tune and when to retrieve', ['fine-tuning', 'rag', 'llm']],
    ['Building RAG Systems', 'End-to-end retrieval-augmented generation design', ['rag', 'llm', 'search']],
    ['Vector Databases Compared', 'Pinecone, Weaviate, Qdrant, and pgvector side by side', ['vector-db', 'embeddings', 'search']],
    ['AI Agents Architecture', 'Tools, memory, and planning in agentic systems', ['agents', 'ai', 'architecture']],
    ['Multi-Agent Coordination', 'Patterns for agents working together', ['agents', 'multi-agent', 'coordination']],
    ['AI Safety Fundamentals', 'Alignment, robustness, and interpretability basics', ['safety', 'alignment', 'ai']],
    ['Model Quantization Guide', 'Running large models on smaller hardware', ['quantization', 'optimization', 'ml']],
    ['Transfer Learning in Practice', 'Adapting pretrained models to your domain', ['transfer-learning', 'ml', 'fine-tuning']],
    ['Text Embeddings Explained', 'How embeddings capture semantic meaning', ['embeddings', 'nlp', 'vectors']],
    ['Attention Mechanisms Deep Dive', 'Why self-attention powers modern NLP', ['attention', 'transformers', 'nlp']],
    ['Foundation Models Overview', 'The landscape of general-purpose AI models', ['foundation-models', 'ai', 'llm']],
    ['AI Ethics in Production', 'Bias, fairness, and accountability for deployed systems', ['ethics', 'fairness', 'ai']],
    ['Generative AI Patterns', 'Text, image, and audio generation pipelines', ['genai', 'generation', 'ai']],
    ['Computer Vision Basics', 'CNNs, transfer learning, and modern vision models', ['computer-vision', 'cnn', 'ml']],
    ['NLP Pipeline Essentials', 'Tokenization, preprocessing, and modeling for text', ['nlp', 'pipeline', 'ml']],
    ['AI Deployment Strategies', 'Serving models at scale with reliability', ['deployment', 'serving', 'ml']],
    ['MLOps Introduction', 'CI/CD for machine learning pipelines', ['mlops', 'ci', 'ml']],
    ['AI Model Monitoring', 'Detecting drift, degradation, and data quality issues', ['monitoring', 'mlops', 'drift']],
  ],
  Security: [
    ['Zero Trust Architecture', 'Never trust, always verify — implementing ZTA', ['zero-trust', 'architecture', 'security']],
    ['Identity and Access Management', 'Core IAM concepts across cloud providers', ['iam', 'identity', 'security']],
    ['OWASP Top 10 Walkthrough', 'The most critical web application security risks', ['owasp', 'web', 'security']],
    ['SQL Injection Prevention', 'Parameterized queries and input validation done right', ['sql-injection', 'web', 'security']],
    ['XSS Attack Vectors', 'Reflected, stored, and DOM-based cross-site scripting', ['xss', 'web', 'security']],
    ['CSRF Protection Patterns', 'Anti-forgery tokens and SameSite cookies', ['csrf', 'web', 'security']],
    ['API Security Checklist', 'Authentication, rate limiting, and input validation for APIs', ['api', 'security', 'checklist']],
    ['OAuth 2.0 Flows Explained', 'Authorization code, implicit, client credentials, and PKCE', ['oauth', 'auth', 'security']],
    ['JWT Best Practices', 'Signing, expiration, and refresh token patterns', ['jwt', 'auth', 'tokens']],
    ['mTLS Implementation', 'Mutual TLS for service-to-service authentication', ['mtls', 'tls', 'security']],
    ['Secrets Management', 'Vault, AWS Secrets Manager, and SOPS compared', ['secrets', 'vault', 'security']],
    ['Vulnerability Scanning', 'Tools and workflows to find issues before attackers do', ['scanning', 'vulnerabilities', 'security']],
    ['SIEM Tools Compared', 'Splunk, Elastic Security, and open-source alternatives', ['siem', 'monitoring', 'security']],
    ['DevSecOps Practices', 'Shifting security left in the delivery pipeline', ['devsecops', 'ci', 'security']],
    ['Container Security Hardening', 'Image scanning, runtime protection, and policy', ['containers', 'security', 'hardening']],
    ['Network Security Fundamentals', 'Firewalls, segmentation, and defense in depth', ['network', 'security', 'basics']],
    ['Encryption at Rest and Transit', 'When and how to encrypt your data', ['encryption', 'security', 'data']],
    ['TLS 1.3 Handshake', 'Whats new in TLS 1.3 and why it matters', ['tls', 'cryptography', 'security']],
    ['Penetration Testing Basics', 'Ethical hacking methodology and common tools', ['pentest', 'security', 'ethical-hacking']],
    ['HTTP Security Headers', 'CSP, HSTS, X-Frame-Options, and friends', ['headers', 'web', 'security']],
  ],
};

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildBody(title, category, tags) {
  return `# ${title}

## Overview

This article covers **${title.toLowerCase()}** in the context of ${category}. It is part of the CloudNative Atlas knowledge base.

## Key Concepts

- **Foundation**: Understand the core problem this solves
- **Trade-offs**: Know when to apply and when to avoid this approach
- **Tooling**: Common tools in the ${category} ecosystem

## Practical Example

\`\`\`bash
# Example command relevant to ${category.toLowerCase()}
echo "Hello from ${title}"
\`\`\`

## Deep Dive

Topics like this benefit from hands-on practice. Each of the tags (${tags.join(', ')}) represents a rabbit hole worth exploring on its own. Start by running the example above, then adapt it to a real workload.

## Further Reading

Related posts on this site cover adjacent concepts in ${category}. Explore the \`${category}\` category to continue.
`;
}

function randomDateInRange(daysBack) {
  const now = Date.now();
  const offset = Math.floor(Math.random() * daysBack) * 24 * 60 * 60 * 1000;
  const d = new Date(now - offset);
  return d.toISOString().split('T')[0];
}

function writePost(slug, frontmatter, body) {
  const fmLines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      fmLines.push(`${key}:`);
      value.forEach((v) => fmLines.push(`  - ${v}`));
    } else if (typeof value === 'string' && (value.includes(':') || value.includes("'"))) {
      fmLines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      fmLines.push(`${key}: ${value}`);
    }
  }
  fmLines.push('---');
  const content = fmLines.join('\n') + '\n\n' + body;
  fs.writeFileSync(path.join(BLOG_DIR, `${slug}.mdx`), content, 'utf-8');
}

if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}

const authors = ['CloudNative Atlas Team', 'Jane Engineer', 'Alex Ops', 'Sam Data', 'Priya Security'];
let total = 0;
const summary = {};

for (const [category, topics] of Object.entries(TOPICS)) {
  summary[category] = 0;
  for (const [title, description, tags] of topics) {
    const slug = slugify(title);
    const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${slug}.mdx already exists`);
      continue;
    }
    const author = authors[Math.floor(Math.random() * authors.length)];
    const pubDate = randomDateInRange(120);
    writePost(slug, {
      title,
      description,
      pubDate,
      author,
      category,
      tags,
      status: 'published',
    }, buildBody(title, category, tags));
    summary[category]++;
    total++;
  }
  console.log(`[${category}] generated ${summary[category]} posts`);
}

console.log(`\nTotal new posts: ${total}`);
console.log(`Blog directory: ${BLOG_DIR}`);
