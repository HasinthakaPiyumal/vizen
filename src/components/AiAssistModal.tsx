import { useState, useRef, useEffect } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';

interface Props {
  onClose: () => void;
}

const SCHEMA_DOCS = `
## Vizen Diagram JSON Schema

A Vizen diagram is a JSON object with the following top-level keys:

### Top-level
- "title": string — Diagram title.
- "nodes": DiagramNode[] — Array of node objects.
- "edges": DiagramEdge[] — Array of edge (connection) objects.
- "steps": Step[] — Array of presentation step objects.
- "stepIdx": number — Currently active step index (0-based).

### DiagramNode
Each node is a box/shape on the canvas.
| Field      | Type     | Required | Description |
|------------|----------|----------|-------------|
| id         | string   | Yes      | Unique identifier (e.g. "node_1"). |
| type       | string   | Yes      | Shape type: "rect", "circle", "diamond", "text". |
| label      | string   | Yes      | Display label text. |
| labelHtml  | string   | No       | Rich HTML label (overrides plain label when present). |
| sub        | string   | Yes      | Subtitle shown below label. |
| x          | number   | Yes      | X position in scene coordinates. |
| y          | number   | Yes      | Y position in scene coordinates. |
| w          | number   | Yes      | Width in scene units (min 60). |
| h          | number   | Yes      | Height in scene units (min 36). |
| accent     | string   | Yes      | Color theme: "blue", "violet", "mint", "green", "pink", "coral", "amber", "neutral". |
| big        | boolean  | No       | If true, node renders larger with accent bar on top. |
| extra      | string[] | No       | Extra detail lines shown inside big nodes. |

### DiagramEdge
Each edge is a connection line between two nodes.
| Field        | Type    | Required | Description |
|--------------|---------|----------|-------------|
| id           | string  | Yes      | Unique identifier (e.g. "edge_1"). |
| from         | string  | Yes      | Source node id. |
| to           | string  | Yes      | Target node id. |
| label        | string  | No       | Text label displayed at midpoint of the curve. |
| defaultColor | string  | Yes      | Hex color of the edge (e.g. "#7b9fff"). |
| lineType     | string  | No       | "solid" (default), "dashed", or "dotted". |
| arrowHead    | boolean | No       | Show arrow at destination (default true). |
| arrowTail    | boolean | No       | Show arrow at source (default false). |

### Step (Presentation Steps)
Steps define animation/presentation slides that highlight nodes and animate edge flows.
| Field     | Type        | Required | Description |
|-----------|-------------|----------|-------------|
| id        | string      | Yes      | Unique identifier (e.g. "step_0"). |
| passLabel | string      | Yes      | Label shown in the step badge (e.g. "ARCHITECTURE"). |
| passColor | string      | Yes      | Hex color for the badge. |
| taskEmoji | string      | Yes      | Emoji icon for the step. |
| taskName  | string      | Yes      | Step name/title. |
| task      | number      | Yes      | Task group index (for grouping steps). |
| lit       | string[]    | Yes      | Array of node IDs to highlight/glow in this step. |
| flows     | FlowEntry[] | Yes      | Array of edge flow animations for this step. |
| desc      | string      | Yes      | HTML description shown during presentation. Supports <strong> tags. |

### FlowEntry
Defines animated particles flowing along an edge during a step.
| Field  | Type   | Required | Description |
|--------|--------|----------|-------------|
| edgeId | string | Yes      | The edge id to animate. |
| color  | string | No       | Override color for the flow (defaults to edge color). |
| speed  | number | No       | Animation speed multiplier (default 1). |

## Layout Tips
- Nodes are positioned via x, y coordinates. Space them ~160-200 units apart horizontally and ~120-150 vertically.
- Typical node sizes: w=130, h=56 for normal; w=150, h=100 for big nodes.
- Edge routing is automatic based on node positions (bezier curves).
- Use unique IDs for all nodes, edges, and steps.
`.trim();

function buildNewPrompt(userRequest: string): string {
  return `You are an AI assistant that helps generate brand new Vizen diagrams. Vizen is a visual diagram editor that stores diagrams as JSON.

${SCHEMA_DOCS}

## Example Vizen Diagram JSON structure
\`\`\`json
{
  "title": "Example Architecture",
  "nodes": [
    { "id": "user", "type": "circle", "label": "Client / User", "sub": "Web Browser", "x": 100, "y": 150, "w": 120, "h": 56, "accent": "blue" },
    { "id": "api", "type": "rect", "label": "API Gateway", "sub": "Reverse Proxy", "x": 300, "y": 150, "w": 130, "h": 56, "accent": "violet" },
    { "id": "db", "type": "diamond", "label": "PostgreSQL DB", "sub": "Database", "x": 500, "y": 150, "w": 130, "h": 80, "accent": "mint" }
  ],
  "edges": [
    { "id": "edge_user_api", "from": "user", "to": "api", "label": "HTTPS Request", "defaultColor": "#7b9fff", "lineType": "solid", "arrowHead": true },
    { "id": "edge_api_db", "from": "api", "to": "db", "label": "SQL Query", "defaultColor": "#a78bfa", "lineType": "dashed", "arrowHead": true }
  ],
  "steps": [
    {
      "id": "step_0",
      "passLabel": "OVERVIEW",
      "passColor": "#7b9fff",
      "taskEmoji": "🚀",
      "taskName": "Initial Setup",
      "task": 0,
      "lit": ["user", "api"],
      "flows": [
        { "edgeId": "edge_user_api", "speed": 1 }
      ],
      "desc": "The client sends an HTTPS request to the <strong>API Gateway</strong>."
    }
  ],
  "stepIdx": 0
}
\`\`\`

## User's Request
Create a new diagram based on: ${userRequest}

## Instructions
Based on the user's request, generate a COMPLETE diagram JSON matching the Vizen schema. Return ONLY the raw JSON object (no markdown code fences, no explanations). The JSON must be valid and follow the Vizen schema exactly. Ensure all node/edge IDs referenced in steps actually exist in the nodes/edges arrays.`;
}

function buildUpdatePrompt(userRequest: string, currentDiagram: string): string {
  return `You are an AI assistant that helps modify Vizen diagrams. Vizen is a visual diagram editor that stores diagrams as JSON.

${SCHEMA_DOCS}

## Current Diagram State (Strictly modify this diagram)
\`\`\`json
${currentDiagram}
\`\`\`

## User's Request
Apply these updates: ${userRequest}

## Instructions
Based on the user's request above, modify the current diagram state and generate a COMPLETE updated diagram JSON. You must strictly modify the provided diagram state and return ONLY the raw JSON object (no markdown code fences, no explanations). The JSON must be valid and follow the Vizen schema exactly. Include ALL nodes, edges, and steps — not just the changed ones. Make sure all node/edge IDs referenced in steps actually exist in the nodes/edges arrays.`;
}

type Stage = 'compose' | 'apply';

export function AiAssistModal({ onClose }: Props) {
  const [stage, setStage] = useState<Stage>('compose');
  const [assistMode, setAssistMode] = useState<'new' | 'update'>('update');
  const [userRequest, setUserRequest] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLTextAreaElement>(null);
  const triggerFitView = useDiagramStore(s => s.triggerFitView);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (stage === 'compose') textareaRef.current?.focus();
    if (stage === 'apply') responseRef.current?.focus();
  }, [stage]);

  const handleGeneratePrompt = () => {
    if (!userRequest.trim()) return;
    let prompt = '';
    if (assistMode === 'new') {
      prompt = buildNewPrompt(userRequest.trim());
    } else {
      const { title, nodes, edges, steps, stepIdx } = useDiagramStore.getState();
      const currentDiagram = JSON.stringify({ title, nodes, edges, steps, stepIdx }, null, 2);
      prompt = buildUpdatePrompt(userRequest.trim(), currentDiagram);
    }
    setGeneratedPrompt(prompt);
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
    setStage('apply');
  };

  const handleApply = () => {
    setError('');
    let text = aiResponse.trim();
    // Strip markdown code fences if present
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        setError('Invalid diagram: missing "nodes" array.');
        return;
      }
      useDiagramStore.setState({
        title:   parsed.title   ?? 'Untitled',
        nodes:   parsed.nodes   ?? [],
        edges:   parsed.edges   ?? [],
        steps:   parsed.steps   ?? [],
        stepIdx: parsed.stepIdx ?? 0,
        selection: null,
      });
      triggerFitView();
      onClose();
    } catch (e) {
      setError('Invalid JSON. Please make sure you pasted the complete AI response.');
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="ai-modal-panel" onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.5l-3.7 1.9.7-4.1-3-2.9 4.2-.8L8 1z"
                    stroke="#a78bfa" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(167,139,250,0.15)"/>
            </svg>
            <span className="modal-title">AI Assist</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {stage === 'apply' && (
              <button className="btn" style={{ fontSize: 11 }} onClick={() => setStage('compose')}>
                ← Back
              </button>
            )}
            <button className="btn icon" onClick={onClose}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ai-modal-body">
          {stage === 'compose' && (
            <>
              <div className="ai-stage-label">
                <span className="ai-step-num">1</span>
                Select Assist Mode
              </div>
              <div className="tb-tool-group" style={{ marginBottom: 14, display: 'flex', gap: 4 }}>
                <button
                  className={`tb-tool-btn ${assistMode === 'new' ? 'active' : ''}`}
                  onClick={() => setAssistMode('new')}
                  style={{ flex: 1, justifyContent: 'center', height: 'auto', padding: '6px 12px' }}
                >
                  New Diagram
                </button>
                <button
                  className={`tb-tool-btn ${assistMode === 'update' ? 'active' : ''}`}
                  onClick={() => setAssistMode('update')}
                  style={{ flex: 1, justifyContent: 'center', height: 'auto', padding: '6px 12px' }}
                >
                  Update Diagram
                </button>
              </div>

              <div className="ai-stage-label">
                <span className="ai-step-num">2</span>
                {assistMode === 'new' ? 'Describe the new diagram' : 'Describe the changes you want'}
              </div>
              <textarea
                ref={textareaRef}
                className="ai-textarea"
                placeholder={assistMode === 'new' 
                  ? "e.g. A multi-tier architecture with a frontend React app, a Node microservice, and a Redis cache..."
                  : "e.g. Add a database node connected to the API node, change the color theme to green..."}
                value={userRequest}
                onChange={e => setUserRequest(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGeneratePrompt();
                  }
                }}
                rows={4}
              />
              <div className="ai-hint">
                {assistMode === 'new' 
                  ? 'The prompt will include example Vizen JSON structure and the schema documentation. Your current diagram will NOT be included.'
                  : 'Your current diagram details and the Vizen schema will be included in the prompt to strictly modify the existing structure.'}
              </div>
              <button
                className="btn primary ai-gen-btn"
                onClick={handleGeneratePrompt}
                disabled={!userRequest.trim()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1l1.8 3.6L14 5.4l-3 2.9.7 4.1L8 10.5l-3.7 1.9.7-4.1-3-2.9 4.2-.8L8 1z"
                        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
                </svg>
                Generate Prompt & Copy
                <span className="ai-kbd">Ctrl+↵</span>
              </button>
            </>
          )}

          {stage === 'apply' && (
            <>
              <div className="ai-copied-banner">
                {copied ? '✓ Prompt copied to clipboard!' : 'Prompt is ready in your clipboard'}
              </div>
              <div className="ai-instructions">
                <span className="ai-step-num">3</span>
                Paste the prompt into your AI assistant (ChatGPT, Claude, Gemini, etc.),
                then paste the AI's JSON response below:
              </div>
              <button className="btn ai-recopy-btn" onClick={handleCopyPrompt}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                Re-copy prompt
              </button>
              <textarea
                ref={responseRef}
                className="ai-textarea ai-response"
                placeholder='Paste the AI-generated JSON here...'
                value={aiResponse}
                onChange={e => { setAiResponse(e.target.value); setError(''); }}
                rows={10}
              />
              {error && <div className="ai-error">{error}</div>}
              <button
                className="btn primary ai-gen-btn"
                onClick={handleApply}
                disabled={!aiResponse.trim()}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                Apply to Diagram
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
