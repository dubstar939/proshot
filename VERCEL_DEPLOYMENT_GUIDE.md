# Vercel Deployment Guide for Three.js FPS Game

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Vercel account (free tier works)

### 2. One-Click Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

Or connect your GitHub repo at [vercel.com](https://vercel.com)

## 📁 Project Structure for Vercel

```
/workspace
├── vercel.json              # Vercel configuration
├── vite.config.js           # Build optimization
├── package.json             # Scripts & dependencies
├── index.html               # Entry point
├── src/                     # Source code
│   ├── main_modular.js      # Main entry
│   └── systems/             # Game systems
│       ├── optimizer.js     # Performance system
│       └── performanceMonitor.js
├── public/                  # Static assets
│   ├── models/              # GLB files
│   └── sounds/              # Audio files
└── dist/                    # Build output (auto-generated)
```

## 🔧 Configuration Files

### vercel.json
Configures:
- Build command: `npm run build:production`
- Output directory: `dist`
- Caching headers for assets
- Security headers
- SPA routing rewrites

### vite.config.js
Optimizes:
- Code splitting (Three.js, vendors, physics)
- Tree shaking
- Minification with esbuild
- Asset organization

## 🎯 Performance Optimizations Applied

### Bundle Analysis
```
Total Bundle Size: ~742 KB (uncompressed)
├── three.js: 558 KB (140 KB gzipped)
├── app code: 153 KB (42 KB gzipped)
├── vendor: 31 KB (9 KB gzipped)
└── CSS: < 1 KB

Gzip Compression Ratio: ~25%
```

### Loading Strategy
1. **Critical path**: Core game loads first
2. **Lazy loading**: Models and audio loaded on demand
3. **Asset caching**: Hashed filenames for long-term caching

### Runtime Optimizations
- Object pooling reduces GC pressure
- Frustum culling hides off-screen objects
- Auto quality adjustment maintains 60 FPS
- Memory management prevents leaks

## 📊 Build Output

After `npm run build:production`:

```
dist/
├── index.html            (0.6 KB)
├── assets/
│   ├── index-*.js       (153 KB) - App code
│   ├── three-*.js       (558 KB) - Three.js library
│   ├── vendor-*.js      (31 KB)  - GSAP, lil-gui
│   └── physics-*.js     (empty)  - Code-split chunk
├── models/              - Copied from public
└── sounds/              - Copied from public
```

## 🔍 Pre-Deployment Checklist

### Code Quality
- [x] ESLint passes: `npm run lint`
- [x] Tests pass: `npm test`
- [x] Build succeeds: `npm run build:production`
- [x] No console errors in development

### Performance
- [x] Bundle size < 1 MB (uncompressed)
- [x] Code splitting implemented
- [x] Object pooling active
- [x] Frustum culling enabled

### Assets
- [ ] Compress GLB models with Draco
- [ ] Optimize textures (WebP format)
- [ ] Compress audio (OGG + MP3 fallback)
- [ ] Add loading placeholders

### Security
- [x] Security headers configured
- [x] No sensitive data in client code
- [x] CORS properly configured
- [x] Content-Security-Policy ready

## 🚢 Deployment Steps

### Method 1: Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to project
cd /workspace

# 3. Login (first time only)
vercel login

# 4. Deploy to preview
vercel

# 5. Deploy to production
vercel --prod
```

### Method 2: Git Integration

1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel dashboard
3. Configure build settings:
   - Build Command: `npm run build:production`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Enable auto-deploy on push

### Method 3: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import Git repository or upload files
3. Configure project settings
4. Click "Deploy"

## ⚙️ Environment Variables

Set in Vercel dashboard or `.env`:

```env
VITE_APP_NAME="Three.js FPS Game"
VITE_APP_VERSION="1.0.0"
VITE_PORT=3000
```

Access in code:
```javascript
const appName = import.meta.env.VITE_APP_NAME;
```

## 📈 Post-Deployment Monitoring

### Vercel Analytics
Enable in dashboard:
- Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Geographic performance

### Custom Metrics
Add to your game:
```javascript
// Send performance data to analytics
const metrics = optimizer.getPerformanceMetrics();
analytics.track('game_performance', metrics);
```

### Error Tracking
Recommended services:
- Sentry (free tier available)
- LogRocket
- Bugsnag

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules/.vite dist
npm run build:production
```

### 404 Errors
Check `vercel.json` rewrites:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

### Slow Load Times
1. Check Network tab in DevTools
2. Enable compression on Vercel (automatic)
3. Use smaller texture sizes
4. Implement progressive loading

### Memory Issues
1. Check for leaks in Chrome DevTools Memory tab
2. Ensure dispose() called on all objects
3. Reduce object pool sizes if needed

## 🎮 Game-Specific Optimizations

### Enemy Count Limits
```javascript
// In botSystem.js or enemyAI.js
const MAX_ACTIVE_ENEMIES = 20; // Adjust based on performance
```

### LOD Distances
```javascript
// Adjust based on your map size
const LOD_DISTANCES = {
  high: 20,
  medium: 50,
  low: 100
};
```

### Shadow Quality
```javascript
// Dynamic shadow quality based on FPS
if (fps < 30) {
  shadowMapSize = 1024;
} else if (fps < 60) {
  shadowMapSize = 2048;
} else {
  shadowMapSize = 4096;
}
```

## 📱 Mobile Optimization

Additional steps for mobile:

1. **Touch Controls**: Ensure responsive input
2. **Reduced Quality**: Lower defaults for mobile
3. **Data Saver**: Option to reduce asset quality
4. **Orientation**: Lock to landscape mode

```javascript
// Detect mobile
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

if (isMobile) {
  // Reduce quality settings
  config.shadowSize = 1024;
  config.maxEnemies = 10;
  config.pixelRatio = 1;
}
```

## 🔐 Security Best Practices

### Headers (configured in vercel.json)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Additional Recommendations
1. Enable HTTPS (automatic on Vercel)
2. Use Subresource Integrity for CDN scripts
3. Implement rate limiting for APIs
4. Sanitize user inputs

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Three.js Performance](https://threejs.org/docs/#manual/en/introduction/How-to-create-things-with-performance)
- [Web Vitals](https://web.dev/vitals/)

## 🆘 Support

For issues:
1. Check Vercel function logs
2. Review build output for warnings
3. Test locally with `vercel dev`
4. Consult Vercel community Discord

---

**Ready to deploy?** Run `vercel --prod` and your game will be live in seconds! 🎉
