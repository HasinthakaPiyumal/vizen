import type { DiagramNode, DiagramEdge, Step } from '../types';

/**
 * Calculates the bounding box of all diagram nodes with a padding.
 */
function getDiagramBounds(nodes: DiagramNode[], pad = 120) {
  if (nodes.length === 0) return { minX: 0, minY: 0, width: 800, height: 600 };
  const xs = nodes.map(n => n.x), xe = nodes.map(n => n.x + n.w);
  const ys = nodes.map(n => n.y), ye = nodes.map(n => n.y + n.h);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xe) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ye) + pad;
  return {
    minX,
    minY,
    width: Math.round(maxX - minX),
    height: Math.round(maxY - minY)
  };
}

/**
 * Extracts all CSS rules from the active document stylesheets,
 * carefully stripping any external resources (like Google Fonts)
 * that would taint the canvas and cause a SecurityError on export.
 */
function getEmbeddedStyles() {
  let styleContent = '';
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      for (let j = 0; j < sheet.cssRules.length; j++) {
        let cssText = sheet.cssRules[j].cssText;
        // Skip external CSS imports which taint the canvas
        if (cssText.startsWith('@import') && cssText.includes('http')) {
          continue;
        }
        // Replace any other external url() references (like background images)
        if (cssText.includes('url(') && cssText.includes('http')) {
          cssText = cssText.replace(/url\(['"]?https?:\/\/[^)]+['"]?\)/gi, 'none');
        }
        styleContent += cssText + '\n';
      }
    } catch {
      // Ignore cross-origin stylesheet access errors
    }
  }
  return styleContent;
}

/**
 * Ensures all HTML elements inside foreignObject have the correct XHTML namespace
 * so they are properly serialized and rendered by the browser's SVG image parser.
 * This preserves rich text formatting, colors, and native word-wrapping.
 */
function fixForeignObjectsForRaster(svgEl: SVGSVGElement) {
  const foElements = svgEl.querySelectorAll('foreignObject');
  foElements.forEach(fo => {
    const allDescendants = fo.querySelectorAll('*');
    allDescendants.forEach(el => {
      if (!el.getAttribute('xmlns')) {
        el.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      }
    });
  });
}

/**
 * Removes interactive-only elements (selection handles, guides, drafts, etc.)
 * from a cloned SVG to produce a clean export.
 */
function cleanSvgForExport(svgEl: SVGSVGElement, isPNG = false) {
  // Remove snap guides
  const guides = svgEl.querySelectorAll('line[stroke="#7b9fff"]');
  guides.forEach(el => el.remove());

  // Remove rect-select rubber band
  const rubberBands = svgEl.querySelectorAll('rect[fill="rgba(123,159,255,0.07)"]');
  rubberBands.forEach(el => el.remove());

  // Remove resize handles
  const resizeHandles = svgEl.querySelectorAll('rect[fill="#7b9fff"][width="8"]');
  resizeHandles.forEach(el => el.remove());

  // Remove port dots (connection handles)
  const portDots = svgEl.querySelectorAll('circle[fill="#7b9fff"][r="5"]');
  portDots.forEach(el => el.remove());

  // Remove endpoint reconnect handles
  const endpointHandles = svgEl.querySelectorAll('circle[fill="#7b9fff"][r="6"]');
  endpointHandles.forEach(el => el.remove());

  // Remove transparent hit-area overlays
  const hitAreas = svgEl.querySelectorAll('rect[fill="transparent"][stroke="none"]');
  hitAreas.forEach(el => el.remove());

  if (isPNG) {
    const particles = svgEl.querySelectorAll('.flow-particle');
    particles.forEach(p => p.remove());
  }

  // Strip animations and drop-shadows which break Canvas rendering
  const allEls = svgEl.querySelectorAll('*');
  allEls.forEach(el => {
    const style = el.getAttribute('style');
    if (style) {
      let newStyle = style
        .replace(/animation:\s*[^;]+;?/g, '')
        .replace(/filter:\s*[^;]+;?/g, '')
        .replace(/offset-path:\s*[^;]+;?/g, '')
        .replace(/offset-rotate:\s*[^;]+;?/g, '');
      if (newStyle.trim() === '') {
        el.removeAttribute('style');
      } else {
        el.setAttribute('style', newStyle);
      }
    }
  });
}

/**
 * Renders an SVG element to a canvas via Blob URL and Image loading.
 * Returns a Promise that resolves with the drawn canvas.
 */
function svgToCanvas(
  svgEl: SVGSVGElement,
  width: number,
  height: number,
  scale = 2
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('Could not get canvas context')); return; }

    const serialized = new XMLSerializer().serializeToString(svgEl);
    console.log('SERIALIZED SVG:', serialized);
    
    // Use a base64 Data URL instead of a Blob URL to prevent canvas tainting
    // when the SVG contains <foreignObject> elements.
    const base64 = btoa(unescape(encodeURIComponent(serialized)));
    const url = `data:image/svg+xml;base64,${base64}`;

    const img = new Image();
    img.onload = () => {
      ctx.scale(scale, scale);
      ctx.fillStyle = '#07090f';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Prepares a clean SVG clone suitable for rasterization (PNG/Video).
 * - Sets proper viewBox and dimensions
 * - Injects all CSS styles
 * - Replaces foreignObjects with SVG text
 * - Strips the viewport transform (uses viewBox instead)
 * - Removes interactive-only elements
 */
function prepareSvgForRaster(
  svgEl: SVGSVGElement,
  bounds: { minX: number; minY: number; width: number; height: number },
  options?: { isPNG?: boolean; timeMs?: number; originalSvg?: SVGSVGElement }
): SVGSVGElement {
  const { minX, minY, width, height } = bounds;
  const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;

  // Set explicit dimensions and viewBox
  clonedSvg.setAttribute('width', width.toString());
  clonedSvg.setAttribute('height', height.toString());
  clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  clonedSvg.removeAttribute('style');
  clonedSvg.removeAttribute('class');

  // Reset the viewport transform group — viewBox handles framing
  const viewportG = clonedSvg.querySelector('g');
  if (viewportG) {
    viewportG.removeAttribute('transform');
  }

  // Inject all stylesheets
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = getEmbeddedStyles();
  clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

  // Add xmlns for proper standalone SVG rendering
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Fix foreignObjects by ensuring XHTML namespaces for rich text to render
  fixForeignObjectsForRaster(clonedSvg);

  if (options?.timeMs !== undefined && options?.originalSvg) {
    const timeMs = options.timeMs;
    const particles = clonedSvg.querySelectorAll('.flow-particle');
    particles.forEach(p => {
      const edgeId = p.getAttribute('data-edge-id');
      const dur = parseFloat(p.getAttribute('data-dur') || '1.6');
      const delay = parseFloat(p.getAttribute('data-delay') || '0');
      
      let t = ((timeMs / 1000) - delay) % dur;
      if (t < 0) t += dur;
      let progress = t / dur;
      let eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      
      if (edgeId) {
        const edgeGroup = options.originalSvg!.querySelector(`g[data-id="${edgeId}"]`);
        if (edgeGroup) {
          const paths = edgeGroup.querySelectorAll('path');
          let dPath: SVGPathElement | null = null;
          for (let i = 0; i < paths.length; i++) {
             if (paths[i].getAttribute('stroke') !== 'transparent') {
                dPath = paths[i] as SVGPathElement;
                break;
             }
          }
          if (dPath && typeof dPath.getTotalLength === 'function') {
            const totalLen = dPath.getTotalLength();
            const pt = dPath.getPointAtLength(eased * totalLen);
            p.setAttribute('cx', String(pt.x));
            p.setAttribute('cy', String(pt.y));
          }
        }
      }
    });
  }

  // Clean up interactive elements
  cleanSvgForExport(clonedSvg, options?.isPNG);

  return clonedSvg;
}

/**
 * Exports the diagram SVG as a high-DPI PNG image.
 */
export const exportToPNG = async (svgEl: SVGSVGElement, nodes: DiagramNode[], title: string) => {
  if (nodes.length === 0) {
    alert('Cannot export an empty diagram.');
    return;
  }

  const bounds = getDiagramBounds(nodes);
  const { width, height } = bounds;
  const dpi = window.devicePixelRatio || 2;

  try {
    const cleanSvg = prepareSvgForRaster(svgEl, bounds, { isPNG: true });
    const canvas = await svgToCanvas(cleanSvg, width, height, dpi);

    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${(title || 'vizen-diagram').toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  } catch (err) {
    console.error('PNG export failed:', err);
    alert('PNG export failed. Check the console for details.');
  }
};

/**
 * Exports the diagram as a self-contained, interactive HTML slide viewer.
 */
export const exportToHTML = (
  svgEl: SVGSVGElement,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  steps: Step[],
  title: string
) => {
  const bounds = getDiagramBounds(nodes, 80); // Ensure HTML export also has good padding

  // Clone SVG for rendering initial view
  const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
  clonedSvg.removeAttribute('style');
  clonedSvg.removeAttribute('class');
  clonedSvg.setAttribute('id', 'canvas-svg');
  
  // Find the inner viewport <g> and strip out reactive handles, drafts, selects, snapped guides
  const viewportG = clonedSvg.querySelector('g');
  if (viewportG) {
    viewportG.setAttribute('id', 'viewport-g');
    viewportG.removeAttribute('transform');
    
    // Remove guides, draft lines, reconnect helpers, selections
    const toRemove = viewportG.querySelectorAll(
      'line[stroke="#7b9fff"], rect[fill="rgba(123,159,255,0.07)"], ' +
      'rect[fill="transparent"][stroke="none"], ' +
      'rect[fill="#7b9fff"][width="8"], ' +
      'circle[fill="#7b9fff"][r="5"], circle[fill="#7b9fff"][r="6"]'
    );
    toRemove.forEach(el => el.remove());
  }

  const serializedSvg = new XMLSerializer().serializeToString(clonedSvg);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vizen - ${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-void: #07090f;
      --bg-surface: #0c101c;
      --fg-1: #f8fafc;
      --fg-2: #cbd5e1;
      --fg-3: #94a3b8;
      --fg-4: #64748b;
      --fg-5: #334155;
      --accent-blue: #7b9fff;
      --line-1: #1e2d4a;
      --line-2: #2a3e63;
      --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'Space Mono', monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0; background: var(--bg-void); color: var(--fg-1);
      font-family: var(--font-sans); display: flex; flex-direction: column;
      height: 100vh; overflow: hidden;
    }
    header {
      background: var(--bg-surface); border-bottom: 1px solid var(--line-1);
      padding: 12px 24px; display: flex; align-items: center; justify-content: space-between;
      height: 54px; z-index: 10;
    }
    .project-title {
      font-size: 15px; font-weight: 700; color: var(--fg-1); letter-spacing: -0.2px;
    }
    .vizen-logo {
      font-size: 10px; font-family: var(--font-mono); color: var(--accent-blue);
      font-weight: 800; border: 1.5px solid var(--accent-blue); padding: 3px 8px;
      border-radius: 6px; letter-spacing: 1.5px; opacity: 0.85;
    }
    #canvas-wrap {
      flex: 1; position: relative; overflow: hidden; display: flex;
      align-items: center; justify-content: center; outline: none;
    }
    .canvas-floor {
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.015) 1.2px, transparent 1.2px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    #canvas-svg {
      width: 100%; height: 100%; position: absolute; inset: 0;
      cursor: grab; user-select: none; -webkit-user-select: none;
    }
    #canvas-svg:active { cursor: grabbing; }
    
    /* Presentation overlay bar */
    #bottom-bar {
      position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(12, 16, 28, 0.85); backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px); border: 1px solid var(--line-1);
      border-radius: 99px; padding: 6px 12px; display: flex; align-items: center;
      gap: 12px; z-index: 20; box-shadow: 0 16px 48px rgba(0,0,0,0.6);
    }
    .btn {
      background: transparent; border: 1px solid var(--line-2); color: var(--fg-2);
      border-radius: 99px; padding: 7px 18px; font-size: 11.5px; cursor: pointer;
      font-weight: 600; transition: all 0.15s ease; display: inline-flex; align-items: center;
      user-select: none; -webkit-user-select: none;
    }
    .btn:hover:not(:disabled) {
      border-color: var(--accent-blue); color: var(--fg-1);
      background: rgba(123,159,255,0.08);
    }
    .btn:disabled { opacity: 0.22; cursor: not-allowed; }
    .btn.primary {
      background: var(--accent-blue); border-color: var(--accent-blue); color: #07090f;
    }
    .btn.primary:hover:not(:disabled) {
      background: #9ab4ff; border-color: #9ab4ff;
    }
    .step-counter {
      font-family: var(--font-mono); font-size: 11px; color: var(--fg-3);
      min-width: 50px; text-align: center; font-weight: 600;
    }
    
    .icon-btn {
      background: transparent; border: 1px solid transparent; color: var(--fg-3);
      width: 28px; height: 28px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; cursor: pointer;
      transition: all 0.15s ease;
    }
    .icon-btn:hover {
      border-color: var(--line-2); color: var(--fg-1);
      background: rgba(255,255,255,0.04);
    }
    .icon-btn.active {
      color: var(--accent-blue); background: rgba(123,159,255,0.1);
      border-color: rgba(123,159,255,0.2);
    }

    /* Details Panel */
    #details-panel {
      position: absolute; top: 24px; right: 24px; width: 340px;
      background: rgba(12, 16, 28, 0.85); backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px); border: 1px solid var(--line-1);
      border-radius: 14px; padding: 18px; z-index: 20;
      box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      max-height: 75vh; overflow-y: auto;
      display: flex; flex-direction: column; gap: 10px;
      transition: opacity 0.25s ease;
    }
    #details-panel.empty { opacity: 0; pointer-events: none; }
    .panel-header-row {
      display: flex; align-items: center; gap: 8px;
    }
    .panel-emoji {
      font-size: 16px;
    }
    .panel-title {
      font-size: 14px; font-weight: 700; color: var(--fg-1); margin: 0;
      letter-spacing: -0.15px;
    }
    .panel-desc {
      font-size: 12px; color: var(--fg-2); line-height: 1.6; margin: 0;
    }
    .panel-desc p { margin: 0 0 8px; }
    .panel-desc p:last-child { margin-bottom: 0; }
    .panel-desc code {
      font-family: var(--font-mono); background: rgba(255,255,255,0.06);
      padding: 1.5px 4.5px; border-radius: 4px; font-size: 11px;
      color: #9cbaff;
    }

    /* Node & Edge Animation styles */
    .node-group { transition: opacity 0.35s ease; opacity: 0.35; }
    .node-group.lit { opacity: 1; }
    
    .edge-group { transition: opacity 0.35s ease; opacity: 0.25; }
    .edge-group.lit { opacity: 1; }
    .edge-path { transition: stroke 0.3s ease, stroke-width 0.3s ease; }
    
    @keyframes vz-flow {
      0% { offset-distance: 0%; }
      100% { offset-distance: 100%; }
    }
    .flow-particle {
      pointer-events: none;
    }

    /* SVG Colors */
    .accent-blue    { fill: #0d1830; stroke: #2a4080; color: #7b9fff; }
    .accent-violet  { fill: #130d1a; stroke: #2d1a3d; color: #a78bfa; }
    .accent-mint    { fill: #0b1a12; stroke: #1a3d2a; color: #34d399; }
    .accent-green   { fill: #0f1a0f; stroke: #1a3d1a; color: #4ade80; }
    .accent-pink    { fill: #1a0d18; stroke: #3d1a30; color: #f472b6; }
    .accent-coral   { fill: #1a0f0f; stroke: #3d1a1a; color: #f87171; }
    .accent-amber   { fill: #1a1408; stroke: #3d2f10; color: #fbbf24; }
    .accent-neutral { fill: #0f1826; stroke: #253450; color: #94a3b8; }
  </style>
</head>
<body>
  <header>
    <div class="project-title">${title}</div>
    <div class="vizen-logo">VIZEN</div>
  </header>

  <main id="canvas-wrap">
    <div class="canvas-floor"></div>
    ${serializedSvg}

    <div id="details-panel">
      <div class="panel-header-row">
        <span id="step-emoji" class="panel-emoji"></span>
        <h3 id="step-title" class="panel-title">Step Name</h3>
      </div>
      <div id="step-desc" class="panel-desc">Step description...</div>
    </div>

    <div id="bottom-bar">
      <button id="btn-prev" class="btn">← Prev</button>
      <span id="step-info" class="step-counter">1 / 1</span>
      <button id="btn-next" class="btn primary">Next →</button>
      <button id="btn-play" class="icon-btn" title="Autoplay">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
      </button>
    </div>
  </main>

  <script>
    const stepsData = ${JSON.stringify(steps)};
    let activeStepIdx = 0;
    let playing = false;
    let playInterval = null;

    // Pan & Zoom vars
    let pan = { x: 0, y: 0 };
    let zoom = 1;
    let isPanning = false;
    let startPos = { x: 0, y: 0 };

    const wrap = document.getElementById('canvas-wrap');
    const svg = document.getElementById('canvas-svg');
    const viewport = document.getElementById('viewport-g');

    // Bounds values generated at export time
    const sceneBounds = { minX: ${bounds.minX}, minY: ${bounds.minY}, width: ${bounds.width}, height: ${bounds.height} };

    // Binds & Pan / Zoom handlers
    function fitView() {
      if (!wrap || !viewport) return;
      const rect = wrap.getBoundingClientRect();
      const z = Math.min((rect.width - 128) / sceneBounds.width, (rect.height - 128) / sceneBounds.height, 1.25);
      zoom = z;
      pan.x = (rect.width - sceneBounds.width * z) / 2 - sceneBounds.minX * z;
      pan.y = (rect.height - sceneBounds.height * z) / 2 - sceneBounds.minY * z;
      updateTransform();
    }

    function updateTransform() {
      if (viewport) {
        viewport.setAttribute('transform', 'translate(' + pan.x + ',' + pan.y + ') scale(' + zoom + ')');
      }
    }

    svg.addEventListener('pointerdown', function(e) {
      if (e.button === 0) {
        isPanning = true;
        startPos = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        svg.setPointerCapture(e.pointerId);
      }
    });

    svg.addEventListener('pointermove', function(e) {
      if (isPanning) {
        pan.x = e.clientX - startPos.x;
        pan.y = e.clientY - startPos.y;
        updateTransform();
      }
    });

    svg.addEventListener('pointerup', function(e) {
      isPanning = false;
    });

    svg.addEventListener('wheel', function(e) {
      e.preventDefault();
      var factor = e.deltaY > 0 ? 0.9 : 1.1;
      var rect = wrap.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      var newZ = Math.max(0.15, Math.min(4, zoom * factor));
      pan.x = mx - (mx - pan.x) * (newZ / zoom);
      pan.y = my - (my - pan.y) * (newZ / zoom);
      zoom = newZ;
      updateTransform();
    }, { passive: false });

    // Step Rendering Logic
    function setStep(idx) {
      activeStepIdx = Math.max(0, Math.min(stepsData.length - 1, idx));
      var step = stepsData[activeStepIdx];
      
      // Update UI bar
      document.getElementById('step-info').textContent = (activeStepIdx + 1) + ' / ' + stepsData.length;
      document.getElementById('btn-prev').disabled = activeStepIdx === 0;
      document.getElementById('btn-next').disabled = activeStepIdx === stepsData.length - 1;

      // Update details panel
      var panel = document.getElementById('details-panel');
      if (step.desc || step.taskName) {
        panel.classList.remove('empty');
        document.getElementById('step-emoji').textContent = step.taskEmoji || '📝';
        document.getElementById('step-title').textContent = step.taskName || '';
        document.getElementById('step-desc').innerHTML = step.desc || '';
      } else {
        panel.classList.add('empty');
      }

      // Highlight nodes
      var litNodes = new Set(step.lit || []);
      var nodeElements = document.querySelectorAll('.node-group');
      nodeElements.forEach(function(el) {
        var id = el.getAttribute('data-id');
        if (litNodes.has(id)) {
          el.classList.add('lit');
        } else {
          el.classList.remove('lit');
        }
      });

      // Highlight edges & particles
      var activeFlows = new Map((step.flows || []).map(function(f) { return [f.edgeId, f]; }));
      var edgeElements = document.querySelectorAll('.edge-group');
      
      edgeElements.forEach(function(el) {
        var id = el.getAttribute('data-id');
        var flow = activeFlows.get(id);
        
        // Remove old particles
        var oldParticles = el.querySelectorAll('.flow-particle');
        oldParticles.forEach(function(p) { p.remove(); });

        if (flow) {
          el.classList.add('lit');
          
          // Find the visible edge path (skip selection halos and hit areas)
          var paths = el.querySelectorAll('path');
          var edgePath = null;
          for (var i = 0; i < paths.length; i++) {
            var p = paths[i];
            var stroke = p.getAttribute('stroke');
            // Skip transparent hit areas and selection halos
            if (stroke && stroke !== 'transparent' && stroke !== '#7b9fff') {
              edgePath = p;
              // Prefer the active glow path (has filter) over dim base path
              if (p.style.filter) { edgePath = p; break; }
            }
          }
          
          var flowColor = flow.color || (edgePath ? edgePath.getAttribute('stroke') : '#7b9fff');
          if (flowColor === '#1e2d4a') flowColor = '#7b9fff'; // Don't use dim color
          
          // Generate flow particles dynamically
          var speed = flow.speed || 1;
          var dur = (1.6 / speed).toFixed(2);
          var dAttr = edgePath ? edgePath.getAttribute('d') : '';

          if (dAttr) {
            for (var i = 0; i < 3; i++) {
              var particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              particle.setAttribute('class', 'flow-particle');
              particle.setAttribute('r', '4');
              particle.setAttribute('fill', flowColor);
              particle.style.offsetPath = "path('" + dAttr + "')";
              particle.style.offsetRotate = '0deg';
              particle.style.animation = 'vz-flow ' + dur + 's ease-in-out infinite';
              particle.style.animationDelay = (i * dur / 3).toFixed(2) + 's';
              particle.style.filter = 'drop-shadow(0 0 5px ' + flowColor + ')';
              el.appendChild(particle);
            }
          }
        } else {
          el.classList.remove('lit');
        }
      });
    }

    // Playback automation
    function togglePlay() {
      playing = !playing;
      var playBtn = document.getElementById('btn-play');
      if (playing) {
        playBtn.classList.add('active');
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        
        playInterval = setInterval(function() {
          if (activeStepIdx < stepsData.length - 1) {
            setStep(activeStepIdx + 1);
          } else {
            setStep(0);
          }
        }, 3000);
      } else {
        playBtn.classList.remove('active');
        playBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>';
        clearInterval(playInterval);
      }
    }

    // Event listeners
    document.getElementById('btn-prev').addEventListener('click', function() {
      if (playing) togglePlay();
      setStep(activeStepIdx - 1);
    });
    document.getElementById('btn-next').addEventListener('click', function() {
      if (playing) togglePlay();
      setStep(activeStepIdx + 1);
    });
    document.getElementById('btn-play').addEventListener('click', togglePlay);

    // Keyboard navigation
    window.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (playing) togglePlay();
        setStep(activeStepIdx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (playing) togglePlay();
        setStep(activeStepIdx - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
    });

    // Init
    window.addEventListener('resize', fitView);
    fitView();
    if (stepsData.length > 0) {
      setStep(0);
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'vizen-diagram').toLowerCase().replace(/\s+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Helper: waits for a given number of milliseconds.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exports the diagram as a WebM video by capturing sequential frames.
 * Uses a sequential frame capture approach instead of requestAnimationFrame
 * to ensure each frame is properly rendered and captured.
 */
export const exportToVideo = async (
  svgEl: SVGSVGElement,
  nodes: DiagramNode[],
  steps: Step[],
  store: { stepIdx: number; setStepIdx: (idx: number) => void },
  title: string,
  onProgress: (percent: number) => void,
  onComplete: () => void
) => {
  if (nodes.length === 0) {
    alert('Cannot export an empty diagram.');
    onComplete();
    return;
  }

  const bounds = getDiagramBounds(nodes, 60);
  const { width, height } = bounds;

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    alert('Could not initialize canvas context.');
    onComplete();
    return;
  }

  // Use captureStream(0) for manual frame control — frames are only
  // pushed when we explicitly call track.requestFrame(), which decouples
  // the video frame rate from the (slow) SVG rendering time.
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const chunks: Blob[] = [];

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8_000_000,
    });
  } catch {
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch (err: any) {
      alert('MediaRecorder is not supported or failed to initialize: ' + err.message);
      onComplete();
      return;
    }
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const recorderStopped = new Promise<void>(resolve => {
    recorder.onstop = () => resolve();
  });

  const originalStepIdx = store.stepIdx;
  const FPS = 30;
  const framesPerStep = 60; // 2 seconds per step at 30fps
  const frameInterval = 1000 / FPS; // 33.33ms
  const totalSteps = steps.length;
  const totalFrames = totalSteps * framesPerStep;

  // Start recording
  recorder.start();

  try {
    for (let stepI = 0; stepI < totalSteps; stepI++) {
      // Set the current step in the store so the live SVG updates
      store.setStepIdx(stepI);

      // Wait for React to re-render the SVG with the new step
      await delay(100);

      for (let frame = 0; frame < framesPerStep; frame++) {
        const globalFrame = stepI * framesPerStep + frame;
        onProgress(Math.min(99, (globalFrame / totalFrames) * 100));

        // Pause recorder so the expensive rendering time below does NOT
        // count toward the video timeline. This is the key trick for
        // perfectly smooth output.
        recorder.pause();

        try {
          // Calculate the virtual animation time for this frame
          const timeMs = globalFrame * frameInterval;

          // Prepare a clean SVG clone for this frame
          const cleanSvg = prepareSvgForRaster(svgEl, bounds, {
            timeMs,
            originalSvg: svgEl,
          });

          // Render SVG to a temporary canvas (this is the slow part)
          const frameCanvas = await svgToCanvas(cleanSvg, width, height, 2);

          // Copy the frame to our recording canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(frameCanvas, 0, 0);
        } catch (err) {
          // On frame error, draw a solid background instead
          ctx.fillStyle = '#07090f';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Resume recording and push this frame — the recorder now sees
        // a fresh canvas and records it for exactly `frameInterval` ms.
        recorder.resume();
        track.requestFrame();

        // Hold the frame for exactly one frame interval so the recorder
        // captures it at the correct duration (33ms = 30fps).
        await delay(frameInterval);
      }
    }

    onProgress(100);
  } catch (err) {
    console.error('Video export frame capture error:', err);
  }

  // Stop recording
  recorder.stop();
  await recorderStopped;

  // Restore original step
  store.setStepIdx(originalStepIdx);

  // Download the video
  const blob = new Blob(chunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'vizen-diagram').toLowerCase().replace(/\s+/g, '-')}.webm`;
  a.click();
  URL.revokeObjectURL(url);

  onComplete();
};
