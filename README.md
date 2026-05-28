# Vizen 🪐

Vizen is a premium, interactive architecture diagramming and step-by-step visualization tool designed for developers, architects, and educators. Built using React, Vite, TypeScript, and Zustand, Vizen combines smooth diagram editing with powerful step-based presentation modes, rendering stunning visuals at 60fps.

---

## ✨ Features

- **🎨 Rich Design & Aesthetics**: Crafted with modern dark-mode styling, glassmorphism overlays, smooth transitions, and high-DPI canvas alignment.
- **📐 Interactive Canvas**:
  - Drag-and-drop node palette.
  - Seamless node connector drafts (with custom path types, custom edge labels, and direction anchors).
  - Full node inline rich text formatting (Bold, Italic, Code, Underline, and Heading sizes).
- **⏱️ Presentation Timeline & Steps**:
  - Create sequential slideshows/steps for diagrams.
  - Highlight specific nodes or paths (step flows) per slide to explain architectural layers step-by-step.
- **⚡ Advanced Laser Pointer Mode**:
  - Excalidraw-style smooth canvas laser trail drawing utilizing quadratic Bezier curve interpolation.
  - Tapered tail fading out gracefully (450ms lifetime) in electric neon red-pink (`#ff2a5f`).
  - Pulsing laser dot (lavender center, pulsing red halo) for premium screen focus.
  - Dual concentric expanding click shockwaves (ripples) with subtle radial-gradients.
- **🤖 AI Assist Integration**: Floating AI prompt modal to generate structured nodes, connections, or descriptions automatically.
- **📥 High-Quality Exporters**:
  - **Save as PNG**: High-resolution PNG exports using clean base64 foreignObject rendering (guaranteeing no tainted canvas security errors).
  - **Save as WebM Video**: Perfect 30fps screen recording that pauses and resumes frame capturing programmatically to match particle velocities, ensuring stutter-free export of canvas animations.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/)
- **Bundler & Build Tool**: [Vite](https://vitejs.dev/)
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Styling**: Modern CSS Custom Properties (tokens.css) & Vanilla CSS (app.css)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HasinthakaPiyumal/vizen.git
   cd vizen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Start the local development server with Vite:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

### Production Build

Compile TypeScript and build the production bundle:
```bash
npm run build
```

The output assets will be generated in the `dist` directory. You can preview the production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

```
vizen/
├── public/              # Static public assets
├── src/
│   ├── components/      # React UI components
│   │   ├── Canvas/      # Interactive SVG/Canvas workspace
│   │   ├── Inspector/   # Node/Edge styling configuration sidebar
│   │   └── Icons.tsx    # Custom inline SVG icons
│   ├── store/           # Zustand diagram state & actions
│   ├── styles/          # Design system CSS tokens and app layout rules
│   ├── types/           # TypeScript interface/type declarations
│   ├── utils/           # Image/Video exporter functions and helpers
│   ├── App.tsx          # App container & main layout
│   └── main.tsx         # Application entry point
├── package.json         # Scripts, dependencies and devDependencies
├── tsconfig.json        # TypeScript configuration settings
└── vite.config.ts       # Vite bundler configuration settings
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
