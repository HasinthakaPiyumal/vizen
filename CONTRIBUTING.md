# Contributing to Vizen 🪐

Thank you for your interest in contributing to Vizen! We welcome contributions from developers of all skill levels to help improve the project.

Please review the guidelines below to ensure a smooth and effective contribution process.

---

## 🗺️ Contribution Workflow

1. **Fork the Repository**: Create a personal fork of the repository on GitHub.
2. **Clone Locally**: Clone your fork to your computer:
   ```bash
   git clone https://github.com/your-username/vizen.git
   cd vizen
   ```
3. **Set Up Upstream Stream**: Add the original repository as a remote named `upstream`:
   ```bash
   git remote add upstream https://github.com/HasinthakaPiyumal/vizen.git
   ```
4. **Create a Feature Branch**: Branch off from the `main` branch with a descriptive name:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
5. **Implement Changes**: Write code, update styles, or write documentations.
6. **Validate Changes**: Run static analysis checks to ensure no TypeScript compilation errors exist:
   ```bash
   npm run build
   ```
7. **Commit & Push**: Commit your changes and push them to your fork:
   ```bash
   git commit -m "feat: description of change"
   git push origin feat/your-feature-name
   ```
8. **Submit a Pull Request (PR)**: Open a PR from your branch to the original repository's `main` branch.

---

## 🎨 Coding Guidelines

### TypeScript & React
- Keep components focused, reusable, and single-purpose.
- Prefer functional components and React hooks (`useCallback`, `useMemo`, `useEffect`).
- Ensure all types are strictly defined in `src/types/index.ts` rather than using `any`.
- Wrap complex handlers in `useCallback` to prevent unnecessary re-renders of nested SVG components on the canvas.

### Styling & CSS Tokens
- We use **Vanilla CSS** with a robust token system. Define variables or import them from `src/styles/tokens.css`.
- Avoid adding inline styles for layouts; instead, use custom layout rules in `src/styles/app.css`.
- Keep the premium aesthetic in mind: use curated color palettes, transparent glassmorphism gradients, smooth transitions, and high-DPI scaling configurations.

---

## 💬 Commit Message Guidelines

We follow lightweight semantic commit style tags to keep history clean and searchable:

- `feat:` A new feature or capability.
- `fix:` A bug fix (e.g., resolving tainted canvas exports).
- `style:` Changes that do not affect code logic (formatting, color visual tweaks, margins).
- `refactor:` Code restructuring without changing functional behavior.
- `docs:` Documentation additions or updates (e.g., editing README).
- `chore:` Changes to build tools, configurations, or package dependencies.

---

## 📬 Need Help?

If you encounter any issues, have design feedback, or need help implementing a feature, feel free to open a GitHub Issue or join our discussions. We'd love to help!
