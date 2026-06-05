# Vizen 🪐

**Vizen** is a free, open-source architecture diagramming and step-by-step visualization tool built for developers, architects, and educators. Powered by React, Vite, TypeScript, and Zustand — Vizen combines an ultra-smooth 60fps interactive canvas with a powerful presentation timeline, AI assist, and high-quality export options.

> 🌐 **Live Demo**: [vizen-rouge.vercel.app](https://vizen-rouge.vercel.app)

---

## 🎬 Demo

<!-- ============================================================
     OPTION A — YouTube video (recommended)
     1. Upload your demo to YouTube
     2. Replace YOUR_VIDEO_ID with the actual YouTube video ID
     3. Replace the thumbnail URL with a real screenshot or
        use: https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg
     ============================================================ -->

<!-- [![Watch the Vizen demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID) -->

<!-- ============================================================
     OPTION B — GitHub-hosted video (MP4)
     1. Open any GitHub Issue or PR in this repo
     2. Drag & drop your .mp4 file into the comment box
     3. GitHub will upload it and give you a URL like:
        https://github.com/user-attachments/assets/xxxx.mp4
     4. Paste that URL below and uncomment the block
     ============================================================ -->

<!-- <video src="https://github.com/user-attachments/assets/YOUR_VIDEO_FILE.mp4" controls width="100%"></video> -->

> 📹 **Demo video coming soon!** In the meantime, try the [live app](https://vizen-rouge.vercel.app) directly.

---

## ✨ Features

- **🎨 Rich Design & Aesthetics** — Modern dark-mode UI, glassmorphism overlays, smooth transitions, and high-DPI canvas rendering.
- **📐 Interactive Canvas**
  - Drag-and-drop node palette
  - Custom connector paths with edge labels and direction anchors
  - Inline rich text formatting per node (Bold, Italic, Code, Underline, Headings)
- **⏱️ Presentation Timeline & Steps**
  - Create sequential step-by-step slideshows directly from your diagram
  - Highlight specific nodes or paths per slide to walk through architecture layers
- **⚡ Advanced Laser Pointer Mode**
  - Excalidraw-style smooth laser trail using quadratic Bézier interpolation
  - Tapered fading tail (450ms lifetime) in electric neon red-pink `#ff2a5f`
  - Pulsing laser dot with lavender center and red halo
  - Dual concentric expanding click shockwaves (ripples)
- **🤖 AI Assist Integration** — Floating AI prompt modal to auto-generate structured nodes, connections, or descriptions
- **📥 High-Quality Exporters**
  - **PNG** — High-resolution export using clean base64 foreignObject rendering (no tainted canvas errors)
  - **WebM Video** — Stutter-free 30fps screen recording synchronized with canvas animations

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [React 18](https://react.dev/) | UI framework |
| [Vite](https://vitejs.dev/) | Bundler & build tool |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Zustand](https://github.com/pmndrs/zustand) | State management |
| [Framer Motion](https://www.framer.com/motion/) | Animations |
| Vanilla CSS + Tokens | Design system & styling |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) v18 or later installed.

### Installation

1. **Fork** this repository, then clone your fork:
   ```bash
   git clone https://github.com/your-username/vizen.git
   cd vizen
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Development Server

Start the local development server:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Production Build

Compile TypeScript and build the production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📂 Project Structure

```
vizen/
├── public/              # Static public assets (icons, manifest, OG image)
├── src/
│   ├── components/      # React UI components
│   │   ├── Canvas/      # Interactive SVG/Canvas workspace
│   │   ├── Inspector/   # Node/Edge styling configuration panel
│   │   └── Icons.tsx    # Custom inline SVG icons
│   ├── store/           # Zustand diagram state & actions
│   ├── styles/          # Design system CSS tokens and app layout rules
│   ├── types/           # TypeScript interface/type declarations
│   ├── utils/           # PNG/WebM exporter functions and helpers
│   ├── App.tsx          # App container & main layout
│   └── main.tsx         # Application entry point
├── index.html           # HTML shell with full SEO meta tags
├── package.json         # Scripts, dependencies, and devDependencies
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite bundler configuration
```

---

## 🤝 Contributing

**Contributions are very welcome!** Whether you're fixing a bug, adding a feature, improving docs, or suggesting ideas — all contributions help make Vizen better.

Please read the [CONTRIBUTING.md](https://github.com/HasinthakaPiyumal/vizen/blob/main/CONTRIBUTING.md) guide before getting started.

- 🐛 **Found a bug?** [Open an issue](https://github.com/HasinthakaPiyumal/vizen/issues/new)
- 💡 **Have a feature idea?** [Start a discussion](https://github.com/HasinthakaPiyumal/vizen/issues/new)
- 🔧 **Want to contribute code?** [Submit a pull request](https://github.com/HasinthakaPiyumal/vizen/pulls)

---

## 📜 License

This project is licensed under the [MIT License](https://github.com/HasinthakaPiyumal/vizen/blob/main/LICENSE).
