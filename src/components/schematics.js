// Bespoke Stripe-style architectural vector schematics for each Claude Fable 5.2 work
// Crisp engineering linework, subtle coordinate grids, and disciplined Stripe color accents

const SCHEMATICS = {
  "fps-port": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <defs>
        <pattern id="g-fps" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(10,37,64,0.06)" stroke-width="1"/>
        </pattern>
        <linearGradient id="bg-fps" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0A2540"/>
          <stop offset="100%" stop-color="#113457"/>
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#bg-fps)"/>
      <rect width="400" height="180" fill="url(#g-fps)" opacity="0.5"/>
      <!-- Perspective deck lines -->
      <g stroke="rgba(0,212,255,0.22)" stroke-width="1">
        <line x1="200" y1="78" x2="20" y2="180"/>
        <line x1="200" y1="78" x2="130" y2="180"/>
        <line x1="200" y1="78" x2="270" y2="180"/>
        <line x1="200" y1="78" x2="380" y2="180"/>
        <line x1="0" y1="112" x2="400" y2="112"/>
        <line x1="0" y1="142" x2="400" y2="142"/>
      </g>
      <!-- Isometric shipping containers -->
      <g fill="rgba(99,91,255,0.24)" stroke="#7A73FF" stroke-width="1.2">
        <polygon points="44,126 112,96 146,108 78,138"/>
        <polygon points="44,126 78,138 78,162 44,150" fill="rgba(99,91,255,0.42)"/>
        <polygon points="274,98 346,118 346,154 274,134" fill="rgba(0,212,255,0.16)" stroke="#00D4FF"/>
      </g>
      <!-- Rain streaks -->
      <g stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-linecap="round">
        <line x1="68" y1="18" x2="60" y2="44"/><line x1="145" y1="12" x2="137" y2="38"/>
        <line x1="262" y1="22" x2="254" y2="48"/><line x1="336" y1="16" x2="328" y2="42"/>
      </g>
      <!-- FPS Reticle & Drone Telemetry -->
      <g transform="translate(200,78)">
        <circle r="22" fill="none" stroke="#00D4FF" stroke-width="1.2" stroke-dasharray="4 4"/>
        <circle r="3" fill="#FF5A5F"/>
        <line x1="-32" y1="0" x2="-12" y2="0" stroke="#00D4FF" stroke-width="1.2"/>
        <line x1="12" y1="0" x2="32" y2="0" stroke="#00D4FF" stroke-width="1.2"/>
        <line x1="0" y1="-30" x2="0" y2="-12" stroke="#00D4FF" stroke-width="1.2"/>
        <line x1="0" y1="12" x2="0" y2="30" stroke="#00D4FF" stroke-width="1.2"/>
      </g>
      <text x="16" y="24" fill="rgba(255,255,255,0.68)" font-family="monospace" font-size="10">SALTLINE // THREE.JS · 1.4MB</text>
      <text x="312" y="24" fill="#00D4FF" font-family="monospace" font-size="10">60 FPS · 0 ASSETS</text>
    </svg>
  `,
  "blender-mcp": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#F6F9FC"/>
      <g stroke="rgba(10,37,64,0.07)" stroke-width="1">
        <line x1="0" y1="45" x2="400" y2="45"/><line x1="0" y1="90" x2="400" y2="90"/><line x1="0" y1="135" x2="400" y2="135"/>
        <line x1="100" y1="0" x2="100" y2="180"/><line x1="200" y1="0" x2="200" y2="180"/><line x1="300" y1="0" x2="300" y2="180"/>
      </g>
      <!-- Pipeline Connectors -->
      <path d="M98 90 H148 M252 90 H302" stroke="#635BFF" stroke-width="1.8" stroke-dasharray="4 3"/>
      <path d="M338 118 C338 152, 62 152, 62 118" fill="none" stroke="#00A67E" stroke-width="1.5" stroke-dasharray="3 3"/>
      <!-- Node 1: Fable Director -->
      <rect x="24" y="62" width="76" height="56" rx="8" fill="#0A2540"/>
      <text x="36" y="86" fill="#00D4FF" font-family="monospace" font-size="9.5" font-weight="600">FABLE 5.2</text>
      <text x="36" y="102" fill="#ADBDCC" font-family="monospace" font-size="8.5">DIRECTOR</text>
      <!-- Node 2: Blender MCP Viewport -->
      <rect x="148" y="42" width="104" height="94" rx="8" fill="#FFFFFF" stroke="rgba(10,37,64,0.16)" stroke-width="1.2"/>
      <polygon points="200,58 232,76 200,94 168,76" fill="rgba(99,91,255,0.15)" stroke="#635BFF" stroke-width="1.3"/>
      <polygon points="168,76 200,94 200,122 168,104" fill="rgba(0,212,255,0.14)" stroke="#0A2540" stroke-width="1.1"/>
      <polygon points="232,76 200,94 200,122 232,104" fill="rgba(99,91,255,0.28)" stroke="#0A2540" stroke-width="1.1"/>
      <!-- Node 3: Vision Critique -->
      <rect x="302" y="62" width="74" height="56" rx="8" fill="#FFFFFF" stroke="#00A67E" stroke-width="1.4"/>
      <text x="314" y="86" fill="#0A2540" font-family="monospace" font-size="9.5" font-weight="600">VISION</text>
      <text x="314" y="102" fill="#00A67E" font-family="monospace" font-size="8.5">CRITIQUE ✓</text>
      <text x="150" y="164" fill="#697386" font-family="monospace" font-size="9">6H AUTONOMOUS LOOP · BPY CHECKPOINTS</text>
    </svg>
  `,
  "starry-shader": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <defs>
        <linearGradient id="bg-star" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0B1D3A"/>
          <stop offset="60%" stop-color="#1B3E7A"/>
          <stop offset="100%" stop-color="#0F264A"/>
        </linearGradient>
      </defs>
      <rect width="400" height="180" fill="url(#bg-star)"/>
      <!-- Curl-noise impasto swirls -->
      <g fill="none" stroke-linecap="round">
        <path d="M24 68 C78 24, 146 28, 174 68 C196 98, 248 106, 286 64 C312 36, 354 38, 380 62" stroke="#00D4FF" stroke-width="3.2" stroke-dasharray="14 8" opacity="0.85"/>
        <path d="M18 86 C76 42, 148 48, 176 86 C202 118, 256 122, 294 82 C320 56, 358 58, 384 78" stroke="#7A73FF" stroke-width="2.4" stroke-dasharray="10 7" opacity="0.8"/>
        <circle cx="118" cy="58" r="18" stroke="#FFCB57" stroke-width="2.5" stroke-dasharray="8 6"/>
        <circle cx="118" cy="58" r="7" fill="#FFCB57"/>
        <circle cx="318" cy="54" r="14" stroke="#FFCB57" stroke-width="2" stroke-dasharray="6 5"/>
        <circle cx="318" cy="54" r="5" fill="#FFCB57"/>
      </g>
      <!-- Rolling horizon & cypress silhouette -->
      <path d="M0 144 Q100 112 210 138 T400 132 L400 180 L0 180 Z" fill="#09121B"/>
      <path d="M62 178 C54 134, 62 92, 72 68 C80 94, 86 136, 80 178 Z" fill="#071018" stroke="rgba(255,203,87,0.3)" stroke-width="1"/>
      <text x="16" y="24" fill="#FFCB57" font-family="monospace" font-size="10">GLSL // CURL-NOISE IMPASTO</text>
      <text x="292" y="168" fill="rgba(255,255,255,0.65)" font-family="monospace" font-size="9.5">2,400 INSTANCES</text>
    </svg>
  `,
  "raymarch-alley": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#06182C"/>
      <!-- Ray marching cones -->
      <g stroke="rgba(0,212,255,0.34)" stroke-width="1" fill="none">
        <line x1="36" y1="90" x2="340" y2="34"/>
        <line x1="36" y1="90" x2="340" y2="90" stroke="#00D4FF" stroke-width="1.4"/>
        <line x1="36" y1="90" x2="340" y2="146"/>
      </g>
      <!-- Sphere-tracing circles -->
      <g fill="rgba(99,91,255,0.12)" stroke="#7A73FF" stroke-width="1.2">
        <circle cx="96" cy="90" r="36"/>
        <circle cx="152" cy="90" r="22"/>
        <circle cx="188" cy="90" r="14"/>
        <circle cx="212" cy="90" r="9"/>
      </g>
      <!-- Hit surface SDF monolith -->
      <rect x="228" y="34" width="44" height="112" rx="4" fill="rgba(255,90,95,0.18)" stroke="#FF5A5F" stroke-width="1.4"/>
      <rect x="292" y="52" width="64" height="94" rx="4" fill="rgba(0,212,255,0.12)" stroke="#00D4FF" stroke-width="1.2"/>
      <circle cx="228" cy="90" r="4" fill="#FFCB57"/>
      <circle cx="36" cy="90" r="4" fill="#FFFFFF"/>
      <text x="16" y="24" fill="#ADBDCC" font-family="monospace" font-size="10">SDF RAY-MARCHER // 96 STEPS</text>
      <text x="274" y="24" fill="#FF5A5F" font-family="monospace" font-size="9.5">ZERO DIFFUSION</text>
    </svg>
  `,
  "exploded-3d": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#F6F9FC"/>
      <g stroke="rgba(10,37,64,0.08)" stroke-width="1">
        <line x1="200" y1="16" x2="200" y2="164" stroke-dasharray="3 3"/>
      </g>
      <!-- Three exploded isometric chassis layers -->
      <g transform="translate(200,46)">
        <polygon points="0,-20 74,4 0,28 -74,4" fill="rgba(99,91,255,0.18)" stroke="#635BFF" stroke-width="1.4"/>
      </g>
      <g transform="translate(200,90)">
        <polygon points="0,-20 74,4 0,28 -74,4" fill="rgba(0,212,255,0.18)" stroke="#0099C2" stroke-width="1.4"/>
        <circle cx="0" cy="4" r="9" fill="#0A2540"/>
      </g>
      <g transform="translate(200,134)">
        <polygon points="0,-20 74,4 0,28 -74,4" fill="rgba(10,37,64,0.10)" stroke="#0A2540" stroke-width="1.4"/>
      </g>
      <!-- Callout annotations -->
      <g stroke="#0A2540" stroke-width="1" fill="none">
        <path d="M274 50 H314"/>
        <path d="M274 94 H314"/>
        <path d="M126 138 H86"/>
      </g>
      <text x="320" y="53" fill="#0A2540" font-family="monospace" font-size="9">SHELL.PBR</text>
      <text x="320" y="97" fill="#0099C2" font-family="monospace" font-size="9">CORE.MCU</text>
      <text x="20" y="141" fill="#425466" font-family="monospace" font-size="9">BASE.ALU</text>
      <text x="16" y="24" fill="#635BFF" font-family="monospace" font-size="9.5">EXPLODE = 0.72 · HIGGSFIELD MCP</text>
    </svg>
  `,
  "mocap-rig": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#0A2540"/>
      <!-- Source CMU skeleton (left) -> Target Rig (right) -->
      <g stroke="#00D4FF" stroke-width="2" stroke-linecap="round">
        <line x1="112" y1="42" x2="112" y2="96"/>
        <line x1="84" y1="62" x2="140" y2="62"/>
        <line x1="112" y1="96" x2="92" y2="146"/>
        <line x1="112" y1="96" x2="132" y2="146"/>
      </g>
      <g stroke="#7A73FF" stroke-width="2.4" stroke-linecap="round">
        <line x1="288" y1="44" x2="294" y2="96"/>
        <line x1="258" y1="66" x2="322" y2="56"/>
        <line x1="294" y1="96" x2="270" y2="146"/>
        <line x1="294" y1="96" x2="318" y2="144"/>
      </g>
      <!-- Retarget mapping arcs -->
      <g stroke="rgba(255,203,87,0.75)" stroke-width="1.2" stroke-dasharray="4 3" fill="none">
        <path d="M122 44 Q200 22 280 44"/>
        <path d="M122 96 Q200 78 286 96"/>
        <path d="M138 144 Q200 162 264 144"/>
      </g>
      <g fill="#FFCB57">
        <circle cx="112" cy="42" r="4"/><circle cx="112" cy="96" r="4"/>
        <circle cx="288" cy="44" r="4"/><circle cx="294" cy="96" r="4"/>
      </g>
      <text x="16" y="24" fill="#ADBDCC" font-family="monospace" font-size="9.5">CMU BVH -> TARGET ARMATURE</text>
      <text x="164" y="124" fill="#FFCB57" font-family="monospace" font-size="9">QUAT RETARGET</text>
    </svg>
  `,
  "sys-port": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#0A2540"/>
      <!-- Stacked ABI translation layers -->
      <rect x="44" y="34" width="312" height="28" rx="5" fill="#163A5F" stroke="rgba(255,255,255,0.16)"/>
      <text x="58" y="52" fill="#FFFFFF" font-family="monospace" font-size="10">WIN32 BINARY // PE LOADER</text>
      <rect x="44" y="76" width="312" height="30" rx="5" fill="rgba(99,91,255,0.28)" stroke="#7A73FF" stroke-width="1.4"/>
      <text x="58" y="95" fill="#00D4FF" font-family="monospace" font-size="10">WINE ABI SHIM · NTDLL / TLS / SIGNALS</text>
      <rect x="44" y="120" width="312" height="28" rx="5" fill="#0E2E4E" stroke="#00A67E" stroke-width="1.3"/>
      <text x="58" y="138" fill="#00E0A8" font-family="monospace" font-size="10">TARGET LEGACY KERNEL · SYSCALLS PASS ✓</text>
      <text x="274" y="22" fill="#ADBDCC" font-family="monospace" font-size="9">ZERO SHORTCUTS</text>
    </svg>
  `,
  "orchestrator-graph": () => `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#F6F9FC"/>
      <g stroke="#635BFF" stroke-width="1.5" fill="none">
        <path d="M122 90 C156 90, 162 44, 198 44"/>
        <path d="M122 90 H198"/>
        <path d="M122 90 C156 90, 162 136, 198 136"/>
        <path d="M276 44 C306 44, 306 90, 326 90" stroke="#00A67E"/>
        <path d="M276 90 H326" stroke="#00A67E"/>
        <path d="M276 136 C306 136, 306 90, 326 90" stroke="#00A67E"/>
      </g>
      <rect x="22" y="66" width="100" height="48" rx="8" fill="#0A2540"/>
      <text x="34" y="87" fill="#00D4FF" font-family="monospace" font-size="9.5" font-weight="600">FABLE 5.2</text>
      <text x="34" y="102" fill="#ADBDCC" font-family="monospace" font-size="8.5">PLANNER</text>
      <g fill="#FFFFFF" stroke="rgba(10,37,64,0.16)" stroke-width="1.2">
        <rect x="198" y="30" width="78" height="28" rx="6"/>
        <rect x="198" y="76" width="78" height="28" rx="6"/>
        <rect x="198" y="122" width="78" height="28" rx="6"/>
      </g>
      <text x="210" y="48" fill="#0A2540" font-family="monospace" font-size="9">WORKER 01</text>
      <text x="210" y="94" fill="#0A2540" font-family="monospace" font-size="9">WORKER 02</text>
      <text x="210" y="140" fill="#0A2540" font-family="monospace" font-size="9">WORKER 03</text>
      <rect x="326" y="66" width="54" height="48" rx="8" fill="#00A67E"/>
      <text x="336" y="94" fill="#FFFFFF" font-family="monospace" font-size="9.5" font-weight="600">GATE</text>
    </svg>
  `,
};

export function renderSchematic(key, fallbackTitle = "CUSTOM ARTIFACT") {
  if (SCHEMATICS[key]) return SCHEMATICS[key]();
  const safeLabel = String(fallbackTitle).slice(0, 22).replace(/[<>&"]/g, "");
  return `
    <svg viewBox="0 0 400 180" aria-hidden="true" class="schematic-svg">
      <rect width="400" height="180" fill="#0A2540"/>
      <g stroke="rgba(0,212,255,0.16)" stroke-width="1">
        <line x1="0" y1="60" x2="400" y2="60"/><line x1="0" y1="120" x2="400" y2="120"/>
        <line x1="133" y1="0" x2="133" y2="180"/><line x1="266" y1="0" x2="266" y2="180"/>
      </g>
      <rect x="128" y="54" width="144" height="72" rx="8" fill="rgba(99,91,255,0.22)" stroke="#7A73FF" stroke-width="1.4"/>
      <circle cx="200" cy="90" r="16" fill="none" stroke="#00D4FF" stroke-width="1.4" stroke-dasharray="4 3"/>
      <circle cx="200" cy="90" r="4" fill="#00D4FF"/>
      <text x="16" y="24" fill="#ADBDCC" font-family="monospace" font-size="9.5">PERSONAL VAULT // ${safeLabel}</text>
    </svg>
  `;
}
