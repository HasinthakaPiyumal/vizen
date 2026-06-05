# Contributing to Vizen 🪐

First off — **thank you for considering a contribution!** Vizen is open to contributions from developers of all skill levels. Whether you're fixing a typo, squashing a bug, or building a whole new feature, every contribution is valued and appreciated.

> 🌐 **Live Demo**: [vizen-rouge.vercel.app](https://vizen-rouge.vercel.app)
> 📁 **Repository**: [github.com/HasinthakaPiyumal/vizen](https://github.com/HasinthakaPiyumal/vizen)

---

## 🧭 Ways to Contribute

- 🐛 **Report a bug** — [Open an issue](https://github.com/HasinthakaPiyumal/vizen/issues/new)
- 💡 **Suggest a feature** — [Open an issue](https://github.com/HasinthakaPiyumal/vizen/issues/new) describing your idea
- 📖 **Improve documentation** — Fix typos, add examples, or clarify confusing sections
- 🔧 **Submit a fix or feature** — Fork → branch → PR (see workflow below)

---

## 🗺️ Contribution Workflow

1. **Fork the repository** on GitHub:
   [github.com/HasinthakaPiyumal/vizen → Fork](https://github.com/HasinthakaPiyumal/vizen/fork)

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/vizen.git
   cd vizen
   ```

3. **Add the upstream remote** so you can sync changes from the original repo:
   ```bash
   git remote add upstream https://github.com/HasinthakaPiyumal/vizen.git
   ```

4. **Create a feature branch** off `main` with a descriptive name:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

5. **Install dependencies** and start the dev server:
   ```bash
   npm install
   npm run dev
   ```

6. **Make your changes** — write code, update styles, or improve docs.

7. **Validate your changes** — run the build to catch any TypeScript errors:
   ```bash
   npm run build
   ```

8. **Commit your changes** using semantic commit messages (see style guide below):
   ```bash
   git commit -m "feat: add zoom-to-fit keyboard shortcut"
   ```

9. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```

10. **Open a Pull Request** against the `main` branch of the original repo:
    [github.com/HasinthakaPiyumal/vizen/pulls](https://github.com/HasinthakaPiyumal/vizen/pulls)

---

## 🎨 Coding Guidelines

### TypeScript & React
- Keep components **focused, reusable, and single-purpose**.
- Use **functional components** and React hooks (`useCallback`, `useMemo`, `useEffect`).
- Define all types strictly in `src/types/index.ts` — avoid using `any`.
- Wrap complex event handlers in `useCallback` to prevent unnecessary re-renders of nested SVG canvas components.

### Styling & CSS Tokens
- We use **Vanilla CSS** with a robust design token system.
- Always define or import CSS variables from `src/styles/tokens.css`.
- Use layout rules from `src/styles/app.css` — avoid ad-hoc inline styles for layout.
- Keep the **premium aesthetic** in mind: curated color palettes, glassmorphism gradients, smooth transitions, and high-DPI scaling.

---

## 💬 Commit Message Guidelines

We follow lightweight semantic commit prefixes to keep history clean and readable:

| Prefix | When to use |
|---|---|
| `feat:` | A new feature or capability |
| `fix:` | A bug fix |
| `style:` | Visual/formatting changes that don't affect logic |
| `refactor:` | Code restructuring without behavior changes |
| `docs:` | Documentation additions or updates |
| `chore:` | Build tools, configs, or dependency updates |

**Examples:**
```bash
git commit -m "feat: add zoom-to-fit button in BottomBar"
git commit -m "fix: resolve tainted canvas error on PNG export"
git commit -m "docs: add contributing workflow to README"
```

---

## 🔃 Keeping Your Fork Up to Date

Before starting new work, always sync your fork with the latest upstream changes:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

---

## 📬 Need Help?

If you're stuck, have questions, or want feedback before submitting a PR, feel free to:

- [Open an issue](https://github.com/HasinthakaPiyumal/vizen/issues/new) with your question
- Comment on an existing issue you're working on

We're happy to guide you through the codebase. All skill levels are welcome! 🙌
