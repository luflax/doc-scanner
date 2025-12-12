# Document Scanner PWA - Deployment Guide

This guide covers deploying the Document Scanner Progressive Web App to various hosting platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build Process](#build-process)
3. [Deployment Platforms](#deployment-platforms)
4. [Configuration](#configuration)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

- **Node.js**: v18 or higher
- **npm**: v9 or higher (or yarn/pnpm)
- **Git**: For version control

### Environment Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd doc-scanner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Verify setup:
   ```bash
   npm run dev
   ```

---

## Build Process

### Production Build

1. **Build the application**:
   ```bash
   npm run build
   ```

   This will:
   - Compile TypeScript to JavaScript
   - Bundle and minify code
   - Generate PWA service worker
   - Optimize assets
   - Create the `dist/` directory

2. **Build output**:
   ```
   dist/
   ├── assets/
   │   ├── index-[hash].js       # Main bundle
   │   ├── react-vendor-[hash].js # React bundle
   │   ├── tesseract-vendor-[hash].js # Tesseract bundle
   │   ├── pdf-vendor-[hash].js   # PDF bundle
   │   └── [other-chunks].js      # Feature chunks
   ├── icons/                     # PWA icons
   ├── index.html                 # Entry point
   ├── manifest.webmanifest       # PWA manifest
   └── sw.js                      # Service worker
   ```

3. **Preview production build locally**:
   ```bash
   npm run preview
   ```

### Build Optimization

The build process includes:
- **Code Splitting**: Separate chunks for vendors and features
- **Minification**: Terser for JS, cssnano for CSS
- **Tree Shaking**: Removes unused code
- **Asset Optimization**: Compressed images and fonts
- **Source Maps**: Hidden source maps for debugging

### Build Configuration

Key settings in `vite.config.ts`:

```typescript
build: {
  target: 'es2020',
  chunkSizeWarningLimit: 1000,
  minify: 'terser',
  sourcemap: 'hidden',
  rollupOptions: {
    output: {
      manualChunks: { /* ... */ }
    }
  }
}
```

---

## Deployment Platforms

### 1. GitHub Pages

**Pros**: Free, automatic HTTPS, easy CI/CD
**Cons**: Static hosting only

#### Setup:

1. **Update base path** in `vite.config.ts`:
   ```typescript
   export default defineConfig({
     base: '/doc-scanner/', // Your repo name
     // ...
   })
   ```

2. **Build and deploy**:
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

3. **Configure GitHub Pages**:
   - Go to repository settings
   - Pages → Source: `gh-pages` branch
   - Save and wait for deployment

#### Automated Deployment:

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 2. Vercel

**Pros**: Automatic HTTPS, serverless functions, analytics
**Cons**: None for static sites

#### Setup:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Production deployment**:
   ```bash
   vercel --prod
   ```

#### Automated Deployment:

Connect your GitHub repository to Vercel:
- Visit [vercel.com](https://vercel.com)
- Import your repository
- Configure build settings (auto-detected)
- Deploy

#### `vercel.json` configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Service-Worker-Allowed",
          "value": "/"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

### 3. Netlify

**Pros**: Drag-and-drop deploy, form handling, split testing
**Cons**: Build minutes limited on free plan

#### Setup:

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

#### Automated Deployment:

Connect your GitHub repository to Netlify:
- Visit [netlify.com](https://netlify.com)
- New site from Git
- Connect to GitHub
- Build settings:
  - Build command: `npm run build`
  - Publish directory: `dist`

#### `netlify.toml` configuration:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Service-Worker-Allowed = "/"
    Cache-Control = "public, max-age=0, must-revalidate"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"
    Cache-Control = "public, max-age=31536000"
```

### 4. Firebase Hosting

**Pros**: Firebase integration, custom domains, CDN
**Cons**: Requires Firebase account

#### Setup:

1. **Install Firebase CLI**:
   ```bash
   npm i -g firebase-tools
   ```

2. **Initialize Firebase**:
   ```bash
   firebase init hosting
   ```

3. **Configure** (select):
   - Public directory: `dist`
   - Single-page app: Yes
   - GitHub integration: Optional

4. **Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

#### `firebase.json` configuration:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Service-Worker-Allowed",
            "value": "/"
          },
          {
            "key": "Cache-Control",
            "value": "public, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

### 5. AWS S3 + CloudFront

**Pros**: Scalable, reliable, custom configuration
**Cons**: More complex setup, costs

#### Setup:

1. **Create S3 bucket**
2. **Enable static website hosting**
3. **Upload dist/ contents**
4. **Create CloudFront distribution**
5. **Configure cache behaviors**

#### Deployment script:

```bash
#!/bin/bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Configuration

### Environment Variables

Create `.env.production`:

```env
VITE_APP_NAME=Document Scanner
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=false
```

Access in code:
```typescript
const appName = import.meta.env.VITE_APP_NAME;
```

### Base URL

Update `base` in `vite.config.ts` if not deploying to root:

```typescript
export default defineConfig({
  base: '/subdirectory/', // Or '/' for root
  // ...
})
```

### PWA Configuration

Update `vite.config.ts` for your domain:

```typescript
VitePWA({
  manifest: {
    name: 'Document Scanner',
    short_name: 'DocScanner',
    start_url: '/',
    scope: '/',
    // ...
  }
})
```

### HTTPS Configuration

**Required for**:
- Camera API
- Service Workers
- Secure features

**Certificate options**:
- Let's Encrypt (free, automatic with many hosts)
- Cloudflare (free tier includes SSL)
- Platform-provided (Vercel, Netlify, etc.)

---

## Post-Deployment

### Verification Checklist

After deployment, verify:

- [ ] Site loads correctly
- [ ] HTTPS is working
- [ ] Service worker registers
- [ ] Camera access works
- [ ] PWA install prompt appears
- [ ] Offline functionality works
- [ ] All navigation routes work
- [ ] Assets load correctly

### Testing

1. **Lighthouse Audit**:
   - Open DevTools
   - Go to Lighthouse tab
   - Run all audits
   - Target: 90+ in all categories

2. **PWA Testing**:
   - Chrome DevTools → Application tab
   - Check manifest
   - Check service worker
   - Test offline mode

3. **Cross-browser Testing**:
   - Chrome (Android/Desktop)
   - Safari (iOS/macOS)
   - Firefox
   - Samsung Internet

4. **Device Testing**:
   - Various screen sizes
   - Different cameras
   - Low-memory devices

### Performance Monitoring

1. **Web Vitals**:
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

2. **Bundle Size**:
   ```bash
   npm run build
   # Check dist/ size
   du -sh dist/
   ```

3. **Analytics** (optional):
   - Google Analytics
   - Plausible
   - Fathom

---

## Troubleshooting

### Build Failures

**Problem**: TypeScript errors
```bash
# Check types
npm run build
# Fix types in affected files
```

**Problem**: Out of memory
```bash
# Increase Node memory
export NODE_OPTIONS=--max_old_space_size=4096
npm run build
```

### Service Worker Issues

**Problem**: Service worker not updating
```bash
# Clear registration in browser
# Application → Service Workers → Unregister
```

**Problem**: Caching issues
- Update version in `vite.config.ts`
- Clear cache and hard reload
- Verify cache headers

### Camera Not Working

**Problem**: Camera blocked
- Ensure HTTPS is configured
- Check browser permissions
- Verify manifest scope

### Routing Issues

**Problem**: 404 on refresh
- Configure server redirects
- All routes → index.html
- See platform-specific configs above

---

## Maintenance

### Updates

1. **Dependencies**:
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```

2. **Security**:
   ```bash
   npm audit
   # Fix critical vulnerabilities immediately
   ```

3. **Performance**:
   - Monitor bundle sizes
   - Check Lighthouse scores
   - Review error logs

### Versioning

Update version in:
- `package.json`
- `vite.config.ts` (manifest)
- `README.md`
- `TODO.md`

### Backup

Regularly backup:
- Source code (Git)
- Configuration files
- Environment variables
- Deployment scripts

### Rollback

To rollback a deployment:

**Vercel**:
```bash
vercel rollback
```

**Netlify**:
- Dashboard → Deploys → Previous deploy → Publish

**GitHub Pages**:
```bash
git revert <commit-hash>
git push origin gh-pages
```

---

## Performance Benchmarks

Target metrics:
- **First Load**: < 3s
- **Bundle Size**: < 500KB (initial)
- **Lighthouse Score**: 90+
- **Camera Init**: < 2s
- **OCR Processing**: < 5s per page

---

## Security Considerations

1. **HTTPS Only**: Always use HTTPS
2. **CSP Headers**: Configure Content Security Policy
3. **No Secrets**: Don't commit API keys or secrets
4. **Dependency Audit**: Regular security audits
5. **User Data**: All data stored locally, no transmission

---

## Support

For deployment issues:
1. Check platform documentation
2. Review build logs
3. Test locally with `npm run preview`
4. Check browser console for errors
5. Verify all environment variables

---

**Version**: 1.0
**Last Updated**: December 2024

Happy deploying! 🚀
