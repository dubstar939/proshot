# Three.js FPS Game - Production Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Building for Production](#building-for-production)
4. [Deployment Options](#deployment-options)
   - [GitHub Pages](#github-pages)
   - [Netlify](#netlify)
   - [Vercel](#vercel)
   - [Docker](#docker)
   - [Traditional Web Server](#traditional-web-server)
5. [Performance Optimization](#performance-optimization)
6. [Security Considerations](#security-considerations)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Latest version

### Verify Installation
```bash
node --version  # Should be v18.0.0+
npm --version   # Should be v9.0.0+
git --version
```

### Install Dependencies
```bash
npm install
```

---

## Local Development

### Start Development Server
```bash
npm run dev
```

The game will open automatically at `http://localhost:3000`

### Available Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (development mode) |
| `npm run build:production` | Build optimized production bundle |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Check code quality with ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |

---

## Building for Production

### Standard Production Build
```bash
npm run build:production
```

This creates an optimized build in the `dist/` directory with:
- Minified JavaScript and CSS
- Tree-shaking to remove unused code
- Code splitting for faster initial load
- Optimized asset compression
- Source maps disabled

### Analyze Bundle Size
```bash
npm run analyze
```

Opens a visual representation of bundle composition to identify optimization opportunities.

### Build Output Structure
```
dist/
├── assets/
│   ├── models/      # 3D models (.glb files)
│   ├── audio/       # Sound effects and music
│   ├── images/      # Textures and UI images
│   └── [hash].js    # Chunked JavaScript bundles
├── index.html       # Main HTML file
└── [hash].js        # Entry point
```

---

## Deployment Options

### GitHub Pages

#### Setup
1. Update `package.json` with your repository URL
2. Set correct base path in `vite.config.js`:
   ```javascript
   base: '/your-repo-name/',
   ```

#### Deploy
```bash
npm run deploy
```

Your game will be available at:
`https://yourusername.github.io/your-repo-name/`

#### CI/CD with GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build:production
        
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

### Netlify

#### Manual Deploy
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build:production`
3. Set publish directory: `dist`

#### netlify.toml Configuration
```toml
[build]
  command = "npm run build:production"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

### Vercel

#### Automatic Deploy
1. Import your repository to Vercel
2. Vercel auto-detects Vite configuration
3. Deploy happens on every push

#### vercel.json Configuration
```json
{
  "buildCommand": "npm run build:production",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

### Docker

#### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:production

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### Build and Run
```bash
docker build -t threejs-fps-game .
docker run -p 8080:80 threejs-fps-game
```

---

### Traditional Web Server

#### Apache Configuration
Create `.htaccess` in dist folder:
```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Frame-Options "DENY"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType model/gltf-binary "access plus 1 month"
</IfModule>
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/threejs-fps-game/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|glb)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';" always;
}
```

---

## Performance Optimization

### Asset Optimization

#### 3D Models
- Use Draco compression for GLTF models
- Keep polygon count under 50k triangles for mobile
- Implement LOD (Level of Detail) for distant objects
- Merge geometries where possible

#### Textures
- Maximum size: 2048x2048 (1024x1024 for mobile)
- Use KTX2 or BasisU compression
- Convert to WebP for UI elements
- Implement texture atlasing

#### Audio
- Use OGG format for background music
- Use MP3 for sound effects
- Compress to 128kbps or lower
- Implement lazy loading for non-critical sounds

### Runtime Optimizations

#### Enable in vite.config.js
```javascript
build: {
  target: 'esnext',
  minify: 'esbuild',
  cssCodeSplit: true,
  assetsInlineLimit: 4096,
  rollupOptions: {
    output: {
      manualChunks: {
        three: ['three'],
        vendor: ['gsap', 'lil-gui'],
      }
    }
  }
}
```

#### Three.js Best Practices
- Use `BufferGeometry` instead of legacy geometry
- Implement frustum culling
- Use instanced rendering for repeated objects
- Dispose of unused geometries and materials
- Limit real-time lights (max 4-8 per scene)

### Lazy Loading Strategy
```javascript
// Load heavy assets on demand
const loadEnemyModels = async () => {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  // Load models...
};
```

---

## Security Considerations

### Content Security Policy (CSP)

Add to your HTML `<head>`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: blob:; 
               font-src 'self' data:; 
               connect-src 'self'; 
               media-src 'self' blob:; 
               object-src 'none'; 
               base-uri 'self'; 
               form-action 'self';">
```

### Input Validation
- Sanitize all user inputs
- Validate game state transitions server-side (if applicable)
- Prevent XSS through proper escaping

### HTTPS Requirements
- Always serve over HTTPS in production
- Enable HSTS (HTTP Strict Transport Security)
- Use secure WebSocket connections (wss://)

### Rate Limiting (for multiplayer)
- Implement request throttling
- Add cooldown periods for actions
- Monitor for suspicious patterns

---

## Monitoring & Analytics

### Performance Monitoring

#### Core Web Vitals
Track these metrics:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

#### Integration Examples

**Google Analytics:**
```javascript
// In your main.js
if (import.meta.env.PROD) {
  // Initialize GA4
  gtag('config', 'YOUR-GA-ID', {
    send_page_view: false
  });
}
```

**Custom Performance Tracking:**
```javascript
window.addEventListener('load', () => {
  const navigation = performance.getEntriesByType('navigation')[0];
  console.log('Load Time:', navigation.loadEventEnd - navigation.fetchStart);
  
  // Send to analytics endpoint
  fetch('/api/performance', {
    method: 'POST',
    body: JSON.stringify({
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      timestamp: Date.now()
    })
  });
});
```

### Error Tracking

#### Sentry Integration
```bash
npm install @sentry/browser
```

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "YOUR-SENTRY-DSN",
  environment: import.meta.env.MODE,
  release: __APP_VERSION__,
  
  // Set tracesSampleRate to capture performance data
  tracesSampleRate: 0.1,
  
  // Filter out known browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured'
  ]
});
```

---

## Troubleshooting

### Common Build Issues

#### Problem: Module resolution errors
**Solution:** Check import paths and ensure all dependencies are installed
```bash
npm install
rm -rf node_modules package-lock.json
npm install
```

#### Problem: Large bundle size
**Solution:** Analyze bundle and implement code splitting
```bash
npm run analyze
```

#### Problem: Assets not loading in production
**Solution:** Verify base path in vite.config.js matches deployment URL

### Runtime Issues

#### Problem: Black screen / nothing renders
**Checklist:**
- Browser console for errors
- WebGL support (visit: https://get.webgl.org/)
- GPU drivers up to date
- Check if models/audio files loaded successfully

#### Problem: Poor performance
**Solutions:**
- Reduce shadow map size
- Lower pixel ratio limit
- Decrease draw distance
- Reduce particle count
- Check for memory leaks with Chrome DevTools

#### Problem: Controls not working
**Checklist:**
- Pointer Lock API requires user interaction first
- Check browser compatibility
- Ensure canvas has focus
- Verify event listeners are attached

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGL 2.0 | ✅ 56+ | ✅ 51+ | ✅ 15+ | ✅ 79+ |
| Pointer Lock | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| ES Modules | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |

Minimum recommended: Chrome 80+, Firefox 75+, Safari 14+, Edge 80+

---

## Support & Resources

- **Documentation**: `/docs` folder
- **Issue Tracker**: GitHub Issues
- **Discussions**: GitHub Discussions
- **License**: MIT License

---

*Last updated: January 2025*
