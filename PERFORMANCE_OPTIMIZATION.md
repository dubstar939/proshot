# Performance Optimization Guide for Vercel Deployment

## ✅ Completed Optimizations

### 1. Object Pooling System (`src/systems/optimizer.js`)
- **ObjectPool class**: Pre-allocates objects to avoid runtime GC pressure
- **Pools for**: projectiles (30), effects (40), enemies (15), shell casings (100)
- **Benefits**: Reduces garbage collection spikes, prevents frame drops

### 2. Frustum Culling
- Automatically hides objects outside camera view
- Pre-allocated matrices to avoid allocations per frame
- Bounding sphere caching for fast intersection tests
- **Expected improvement**: 20-40% reduction in draw calls for complex scenes

### 3. LOD (Level of Detail) Throttling
- LOD updates throttled to every 100ms instead of every frame
- Reduces CPU overhead for distance-based quality switching

### 4. Memory Management
- Periodic memory checks (every 5 seconds)
- Automatic garbage collection trigger when memory > 80%
- Pool trimming to release unused objects

### 5. Auto Quality Adjustment
- Monitors FPS and adjusts quality dynamically
- Reduces pixel ratio and shadow quality when FPS < 30
- Increases quality when FPS > 60

### 6. UI DOM Optimization
- Visibility caching to prevent redundant DOM operations
- Batched UI updates using requestAnimationFrame
- Single reflow for multiple visibility changes

### 7. Performance Monitor (`src/systems/performanceMonitor.js`)
- Real-time FPS tracking with min/avg/max
- Memory usage monitoring
- Draw call and triangle counting
- Warning system for low FPS and high memory

## 🔧 Code-Level Optimizations Applied

### Avoid Per-Frame Allocations
```javascript
// ❌ BAD: Creates new Vector3 every frame
const dir = new THREE.Vector3().subVectors(target, position);

// ✅ GOOD: Reuse instance vectors
this._tempVector.subVectors(target, position);
```

### Efficient Array Operations
```javascript
// ❌ BAD: Creates new array every filter
const enemies = allObjects.filter(o => o.type === 'enemy');

// ✅ GOOD: Use Set or Map for O(1) lookups
const enemySet = new Set(enemies);
```

### Throttled Updates
```javascript
// Only update expensive operations periodically
if (this._accumulator >= this._interval) {
  this.expensiveOperation();
  this._accumulator = 0;
}
```

### Event Listener Cleanup
```javascript
// Always remove listeners on dispose
window.removeEventListener('resize', this.onResize);
```

## 📊 Vercel-Specific Optimizations

### vercel.json Configuration
- **Static asset caching**: 1 year for hashed assets
- **Model/audio caching**: 1 day with stale-while-revalidate
- **Security headers**: X-Frame-Options, CSP, etc.
- **SPA rewrites**: All routes serve index.html

### Build Optimizations (vite.config.js)
- **Code splitting**: Three.js, vendors, physics chunks
- **Tree shaking**: Removes unused code
- **Minification**: esbuild for production
- **Asset organization**: Models, audio, images in separate folders

## 🎯 Performance Budgets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | 60 | < 30 | < 20 |
| Frame Time | 16ms | > 33ms | > 50ms |
| Memory Usage | < 50% | > 80% | > 90% |
| Draw Calls | < 150 | > 200 | > 300 |
| Triangles | < 75k | > 100k | > 150k |
| Active Enemies | < 20 | > 30 | > 50 |

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Run `npm run build:production` successfully
- [ ] Check bundle size < 500KB (gzipped)
- [ ] Test on mobile devices
- [ ] Verify no console errors
- [ ] Run Lighthouse audit (target: 90+)

### Post-Deployment
- [ ] Monitor real-user metrics (RUM)
- [ ] Check Core Web Vitals in Vercel dashboard
- [ ] Set up error tracking (Sentry recommended)
- [ ] Configure analytics for performance data

## 🛠 Debugging Tools

### Enable Performance Overlay
```javascript
// In browser console after loading game
window.game.getSystem('optimizer').logMetrics();
```

### Chrome DevTools Performance Tab
1. Record during gameplay
2. Look for long tasks (> 50ms)
3. Check for layout thrashing
4. Monitor JS heap size

### Firefox Profiler
- Better for WebGL debugging
- Shows GPU timeline
- Memory allocation tracking

## 📈 Expected Results

With these optimizations:
- **Initial load**: < 3 seconds on 4G
- **Time to interactive**: < 2 seconds
- **Stable FPS**: 55-60 on modern devices
- **Memory footprint**: < 200 MB
- **Lighthouse score**: 90+

## 🔍 Troubleshooting

### Low FPS (< 30)
1. Check optimizer logs: `getPerformanceMetrics()`
2. Reduce enemy count
3. Lower shadow quality
4. Enable frustum culling

### High Memory (> 80%)
1. Check for memory leaks in DevTools
2. Ensure proper dispose() calls
3. Reduce texture sizes
4. Trim object pools

### Long Load Times
1. Compress GLB models ( Draco compression)
2. Lazy load non-critical assets
3. Use texture atlases
4. Implement progressive loading

## 📚 Additional Resources

- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/How-to-create-things-with-performance)
- [Vercel Web Performance](https://vercel.com/docs/concepts/web-performance)
- [Web Vitals](https://web.dev/vitals/)
