# Three.js FPS Game - Contributing Guide

## Welcome Contributors! 👋

Thank you for your interest in contributing to the Three.js FPS Game project! This guide will help you get started.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Issue Reporting](#issue-reporting)
8. [Feature Requests](#feature-requests)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone. Please be respectful and constructive in your interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Gracefully accept constructive criticism
- Focus on what's best for the community
- Show empathy towards other community members

---

## Getting Started

### 1. Fork the Repository

```bash
# Click "Fork" on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/threejs-fps-game.git
cd threejs-fps-game
```

### 2. Set Up Development Environment

```bash
# Install dependencies
npm install

# Create feature branch
git checkout -b feature/your-feature-name
```

### 3. Verify Setup

```bash
# Run development server
npm run dev

# Run tests
npm test

# Check code quality
npm run lint
```

---

## Development Workflow

### Branch Naming Convention

Use descriptive branch names:

```
feature/add-new-weapon
fix/collision-detection-bug
docs/update-readme
refactor/optimize-rendering
test/add-health-system-tests
```

### Making Changes

1. **Create a new branch** (never work on `main`)
2. **Make small, focused commits**
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Run all checks** before pushing

### Testing Your Changes

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Check for linting errors
npm run lint

# Format code
npm run format

# Build production version
npm run build:production

# Preview production build
npm run preview
```

---

## Coding Standards

### JavaScript Style Guide

We follow modern ES6+ standards with these conventions:

#### Formatting
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Max line length**: 80 characters
- **Trailing commas**: ES5 (in objects/arrays)

Example:
```javascript
const config = {
  name: 'Player',
  health: 100,
  abilities: ['jump', 'shoot'],
};
```

#### Naming Conventions

```javascript
// Classes: PascalCase
class PlayerController { }

// Functions/Methods: camelCase
function calculateDamage() { }

// Constants: UPPER_SNAKE_CASE
const MAX_HEALTH = 100;

// Private methods: _underscore prefix
_internalMethod() { }

// Files: camelCase.js
playerController.js
```

#### Imports Organization

```javascript
// 1. Third-party libraries
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 2. Internal modules (with blank line)
import { GameManager } from '@systems/gameManager';
import { createScene } from '@components/scene';

// 3. Relative imports (with blank line)
import { utils } from './utils.js';
```

### JSDoc Documentation

All public APIs must be documented:

```javascript
/**
 * Creates a new weapon system
 * @param {THREE.Camera} camera - Player camera
 * @param {THREE.Scene} scene - Game scene
 * @param {AudioSystem} audioSystem - Audio manager
 * @example
 * const weapons = new WeaponSystem(camera, scene, audio);
 * weapons.equip('rifle');
 */
constructor(camera, scene, audioSystem) {
  // Implementation
}
```

### Error Handling

Always handle errors gracefully:

```javascript
// ✅ Good
try {
  await loadAsset(url);
} catch (error) {
  console.error('[AssetLoader] Failed to load:', url, error);
  return fallbackAsset;
}

// ❌ Bad
loadAsset(url); // No error handling
```

### Performance Best Practices

```javascript
// ✅ Good: Reuse objects
const tempVector = new THREE.Vector3();
function update() {
  tempVector.set(0, 0, 0);
  // Use tempVector...
}

// ❌ Bad: Create new objects in loops
function update() {
  const tempVector = new THREE.Vector3(); // Creates garbage every frame
}
```

---

## Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(weapons): add sniper rifle with scope zoom"

# Bug fix
git commit -m "fix(collision): resolve player falling through floor"

# Documentation
git commit -m "docs(readme): update installation instructions"

# With body
git commit -m "feat(ai): implement enemy pathfinding

- Add A* algorithm for navigation
- Support dynamic obstacle avoidance
- Optimize for large maps

Closes #42"
```

### Pre-commit Checklist

Before committing, ensure:

- [ ] Code is formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] Tests pass (`npm test`)
- [ ] No console.log() in production code
- [ ] Documentation updated if needed

---

## Pull Request Process

### Creating a Pull Request

1. **Push your branch** to your fork
   ```bash
   git push origin feature/your-feature
   ```

2. **Open PR on GitHub**
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill out the PR template

3. **PR Title Format**
   ```
   [Type] Brief description
   Example: [Feature] Add new assault rifle weapon
   ```

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] All existing tests pass

## Screenshots (if applicable)
[Add screenshots here]

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests
2. **Code Review**: Maintainer reviews code quality
3. **Feedback**: Address any requested changes
4. **Approval**: PR approved and merged

### Response Time

We aim to review PRs within:
- **Bug fixes**: 2-3 days
- **Features**: 5-7 days
- **Documentation**: 1-2 days

---

## Issue Reporting

### Before Creating an Issue

1. Search existing issues (open and closed)
2. Check if issue persists in latest version
3. Gather relevant information

### Bug Report Template

```markdown
**Describe the bug**
Clear description of what the bug is

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable, add screenshots

**Environment:**
- OS: [e.g., Windows 10]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

**Additional context**
Any other details
```

### Issue Labels

Issues are labeled for easy identification:

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority:high` - High priority
- `priority:low` - Low priority

---

## Feature Requests

### Submitting a Feature Request

1. **Check existing requests** to avoid duplicates
2. **Use the feature request template**
3. **Provide detailed description**

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
What you want to happen

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Any other details, mockups, etc.
```

### Feature Prioritization

Features are prioritized based on:
- Community interest (reactions, comments)
- Alignment with project goals
- Implementation complexity
- Available resources

---

## Development Tips

### Debugging

```javascript
// Enable debug mode
const game = new ProShotGame({ debug: true });

// Use browser DevTools
// - Performance tab for profiling
// - Console for logging
// - Sources for breakpoints
```

### Hot Reload

During development, changes auto-reload:
```bash
npm run dev
# Edit files -> Browser updates automatically
```

### Profiling

```javascript
// Measure performance
console.time('operation');
// ... code ...
console.timeEnd('operation');

// Check frame rate
// Press F12 -> Performance tab
```

---

## Questions?

Need help? Reach out through:

- **GitHub Discussions**: General questions
- **Discord**: Real-time chat (link in README)
- **Email**: your.email@example.com

---

## Thank You! 🎉

Your contributions make this project better for everyone. We appreciate your time and effort!

*"Alone we can do so little; together we can do so much."*
