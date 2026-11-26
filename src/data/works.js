// Real November 2026 Claude Fable 5.2 community masterpieces & technical anatomy data

export const CATEGORY_META = {
  all: { label: "全部作品", short: "ALL" },
  "3d-games": { label: "3D 与浏览器游戏", short: "3D / GAME" },
  "shaders-motion": { label: "Shader 与代码动画", short: "SHADER / FX" },
  "blender-mcp": { label: "Blender / MCP 自动化", short: "MCP / 3D" },
  "systems-arch": { label: "长程系统与编排", short: "SYSTEMS" },
};

export const EFFORT_META = {
  max: { label: "Effort: Max", tone: "amber" },
  high: { label: "Effort: High", tone: "blurple" },
  medium: { label: "Effort: Medium", tone: "emerald" },
};

export const INITIAL_WORKS = [
  {
    id: "saltline-fps",
    title: "Saltline · 单 Prompt 1.4MB 浏览器 3D FPS",
    subtitle: "零外部素材，单文件 HTML 内嵌 Three.js 场景、无人机 AI 与合成音效",
    creator: "Felix Rieseberg / realcodebear",
    sourceLabel: "github.com/realcodebear/saltline-fable-5.2",
    sourceUrl: "https://github.com/realcodebear/saltline-fable-5.2",
    category: "3d-games",
    effort: "max",
    horizon: "单条 Prompt · 1.4MB 单文件",
    verifiedDate: "2026-11",
    featured: true,
    schematic: "fps-port",
    tags: ["Three.js", "Web Audio", "Procedural", "Single-File"],
    summary:
      "用单条结构化 Prompt 从零生成雨夜集装箱码头 3D 第一人称射击游戏：所有模型、程序化贴图、巡逻无人机、机械犬 AI 与合成枪声全部封装在一个可直接双击运行的 HTML 中。",
    quickPeek: {
      promptCore:
        "强制约定单文件自包含约束 + 明确程序化几何/Canvas 贴图/Web Audio 合成三套零资产管线，避免模型输出死链接占位图。",
      breakthrough:
        "128K 超大输出窗口配合 Adaptive Thinking，一次性维持了渲染循环、碰撞体、敌人状态机与声效系统的全局一致性。",
    },
    deepDive: {
      whyItMatters:
        "过去大模型写 3D 游戏往往停留在“方块打方块”的玩具 Demo。Saltline 证明了 Claude Fable 5.2 可以在单次长输出中，把工业级关卡氛围（雨幕粒子、湿滑反光、集装箱掩体拓扑）与完整玩法闭环打包交付。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "雨夜集装箱港口 + 多兵种立体对抗",
          detail:
            "进入页面即锁定第一人称视角，拥有俯仰后坐力、弹道火花、空中无人机与地面机械犬两种 AI 行为树，全套环境雨声和武器声场由 Web Audio API 实时振荡器合成。",
        },
        {
          step: "02 · Prompt 与约束策略",
          title: "把“素材缺失”转化为程序化生成规则",
          detail:
            "明确禁止引用外部 GLTF/PNG/MP3，要求模型通过 Canvas 2D 生成法线与锈蚀贴图、用几何基元拼装模块化集装箱，并将物理步长固定在 60Hz 子步防穿模。",
        },
        {
          step: "03 · 架构与边界",
          title: "1.4MB 单体代码的取舍",
          detail:
            "单文件极便于传播和开箱即玩，但后期多人协作迭代困难。复用时建议先用单文件验证玩法手感，再拆分为 ECS 模块目录。",
        },
      ],
      takeaways: [
        "在 Prompt 顶部显式声明“Zero external assets”，能逼出模型最强的程序化贴图与声效合成能力。",
        "为 3D 关卡预先规定坐标尺度（如 1 unit = 1m、集装箱标准 6×2.4×2.6m），可大幅减少穿模和视角违和感。",
        "利用 Fable 5.2 的 128K output 上限，把状态机与渲染管线一次规划完毕，避免多轮拼接破坏变量命名。",
      ],
      promptSpec: `// Prompt 架构摘录（复现关键段）
role: "Principal Graphics & Gameplay Engineer"
model: "claude-fable-5-2"
thinking: { type: "adaptive", effort: "max" }

constraints:
  - Deliver ONE self-contained index.html (Three.js ESM only)
  - ZERO external textures, meshes, or audio URLs
  - Generate rusted metal/wet asphalt textures via offscreen <canvas>
  - Synthesize gunfire, rain ambiance & drone hum via Web Audio API

gameplay_loop:
  setting: "Rain-slicked industrial container port at night"
  enemies: ["Aerial Patrol Drone (flanking)", "Quadruped Mech Dog (rush)"]
  physics: "Fixed 60Hz AABB collision + weapon recoil spring"`,
      mcpConfig: `{
  "workflow": "single-shot-browser-game",
  "model": "claude-fable-5-2",
  "max_tokens": 96000,
  "thinking": { "type": "adaptive", "effort": "max" },
  "verification": {
    "runner": "playwright-headless",
    "checks": ["fps >= 50", "zero console errors", "canvas non-blank"]
  }
}`,
      reproChecklist: [
        "开启 Adaptive Thinking 并将 effort 设为 max，预留 ≥ 64k output token 空间",
        "先要求模型输出架构草图（坐标系、碰撞盒、音频节点表），确认后再生成完整单文件",
        "打开 Chrome DevTools 核验 WebGL draw calls 与 Web Audio 解锁手势",
      ],
    },
  },
  {
    id: "blender-mcp-6h-film",
    title: "零基础 6 小时 · Blender MCP 自主 3D 动画短片",
    subtitle: "给 Fable 5.2 挂载 Blender MCP 权限，全权担任导演、建模、打光与音效仿真",
    creator: "Reddit r/claude 开发者实录",
    sourceLabel: "reddit.com/r/claude · Long-Horizon Showcase",
    sourceUrl: "https://www.reddit.com/r/claude/",
    category: "blender-mcp",
    effort: "max",
    horizon: "6 小时自主长程执行",
    verifiedDate: "2026-11",
    featured: true,
    schematic: "blender-mcp",
    tags: ["Blender MCP", "Python bpy", "Long-Horizon", "Vision Loop"],
    summary:
      "从未学过 3D 软件的开发者，仅提供一段故事粗稿并开放 Blender MCP 工具链，让 Fable 5.2 在 6 小时内自主迭代分镜、资产建模、关键帧动画、镜头调度与配乐音效。",
    quickPeek: {
      promptCore:
        "把 3D 制作拆成“分镜表 → 灰模预演 → 渲染截帧自检 → 材质打光”四阶段循环，每步强制回看渲染图纠偏。",
      breakthrough:
        "真正打通了“代码操控 DCC 软件（bpy）+ 视觉模型看图审片”的长程闭环，克服了前代模型跑 20 分钟就遗忘镜头连贯性的通病。",
    },
    deepDive: {
      whyItMatters:
        "它展示了“万物皆可设计工程”的终极形态：不懂复杂专业软件 UI 没关系，只要软件暴露了脚本接口和 MCP，长程 Agent 就能靠“写脚本 → 渲染看图 → 改参数”完成跨学科创作。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "完整叙事短片而非单镜头炫技",
          detail:
            "包含多机位切换、基础物理仿真、一致的角色/场景材质和同步音频轨，整体叙事连贯且无明显镜头穿帮。",
        },
        {
          step: "02 · Agent 编排策略",
          title: "用 1M 上下文锁死“分镜圣经”",
          detail:
            "将每个镜头的起止帧、机位坐标、主光源色温记录在 JSON Shotlist 中，每完成一个镜头调用低采样率快速出图，由 Fable 5.2 视觉自检构图后再精渲。",
        },
        {
          step: "03 · 工程护栏",
          title: "断点快照防止长程崩溃",
          detail:
            "每通过一个镜头就另存 `.blend` 版本快照并记录参数变更，避免长程会话中途某次误操作污染整个场景树。",
        },
      ],
      takeaways: [
        "长程创作的核心不是一条神奇 Prompt，而是“每一步可渲染、可回看、可回滚”的检查点机制。",
        "让模型先用极低采样率（16 samples）跑视觉审查，最后统一切 Cycles 高采样成片，能省 80% 算力时间。",
      ],
      promptSpec: `// 6 小时自主导演循环指令模板
mission: "Direct and assemble a 45-second 3D animated short in Blender"
pipeline:
  1. Write shotlist.json (camera_pos, focal_mm, duration_frames, mood)
  2. Build procedural scene geometry via Blender MCP execute_python
  3. Render 480p preview frame -> visually inspect composition & lighting
  4. If clipping, dark silhouette, or broken framing detected -> patch bpy & re-check
  5. Save versioned checkpoint .blend before moving to next shot`,
      mcpConfig: `{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["blender-mcp"],
      "env": { "BLENDER_PORT": "9876" }
    }
  },
  "agentPolicy": {
    "model": "claude-fable-5-2",
    "checkpointEveryShot": true,
    "visualSelfCritique": true
  }
}`,
      reproChecklist: [
        "安装 Blender 4.x 与 Blender MCP 插件并开启本地 Socket 端口",
        "在工作目录预建 `shots/` 与 `checkpoints/` 目录，要求每次成功修改必须版本落盘",
        "先跑通单镜头 5 秒预演闭环，再放开 6 小时全片自主制作",
      ],
    },
  },
  {
    id: "starry-night-rider",
    title: "Starry Night Rider · 梵高星空手绘风格可玩游戏",
    subtitle: "用自定义 GLSL 笔触着色器把印象派油画变成 60fps 交互世界",
    creator: "awesome-fable-5.2 社区精选",
    sourceLabel: "github.com/fengyiqicoder/awesome-fable-5.2",
    sourceUrl: "https://github.com/fengyiqicoder/awesome-fable-5.2",
    category: "3d-games",
    effort: "high",
    horizon: "单会话 WebGL 艺术工程",
    verifiedDate: "2026-11",
    featured: true,
    schematic: "starry-shader",
    tags: ["GLSL", "Painterly Shader", "Flow Field", "Web Preview"],
    summary:
      "打破 3D 网页冰冷塑料感：Fable 5.2 用流场旋涡算法和后处理油画笔触着色器，打造出玩家可骑行穿梭于《星月夜》漩涡星云中的交互浏览器游戏。",
    quickPeek: {
      promptCore:
        "将“梵高风格”拆解为可编程数学特征：Kuwahara 笔触滤波 + 旋涡 curl-noise 天空流场 + 普鲁士蓝/镉黄受限调色盘。",
      breakthrough:
        "模型不再只用泛泛的形容词敷衍美术，而是主动把艺术风格翻译成了可执行的片元着色器数学公式。",
    },
    deepDive: {
      whyItMatters:
        "这是“审美数字化”的绝佳范例——当你想让 AI 避开默认丑陋的 3D 质感，最有效的办法不是说“画好看点”，而是给它数学化的渲染风格配方。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "流动的油画笔触与可交互地形",
          detail:
            "玩家控制剪影骑手在起伏山丘与柏树间穿梭，天空星云随速度实时旋转发光，画面每一帧都像动态油画。",
        },
        {
          step: "02 · 着色器拆分",
          title: "三层渲染管线叠加",
          detail:
            "底层用极简低模构建山坡与村庄轮廓；中层叠加方向性短笔触贴图与星云旋涡流场；顶层加轻量色彩映射锁住梵高色域。",
        },
        {
          step: "03 · 性能控制",
          title: "移动端也可流畅运行的帧率预算",
          detail:
            "把高开销的全屏滤镜降级为实例化笔触粒子（InstancedMesh），大幅降低 GPU 采样压力。",
        },
      ],
      takeaways: [
        "描述艺术风格时，用“色域约束 + 笔触几何形态 + 动态规律”替代空洞的形容词。",
        "InstancedMesh 批量绘制笔触比全屏重度后处理更轻、风格化更强。",
      ],
      promptSpec: `// 艺术风格数学化翻译（Shader Spec）
palette:
  sky_deep: "#0B1D3A"
  swirl_cobalt: "#1E4B8F"
  star_cadmium: "#F7C948"
  cypress_ink: "#09121B"

visual_pipeline:
  sky: "2D curl-noise flow field driving 2,400 instanced impasto brush quads"
  terrain: "Procedural sine hills with silhouette cypress trees & warm village windows"
  controls: "Responsive momentum physics + gentle camera bank on turns"`,
      mcpConfig: `{
  "preset": "painterly-webgl-artifact",
  "model": "claude-fable-5-2",
  "thinking": { "type": "adaptive", "effort": "high" },
  "targetFps": 60,
  "renderer": "WebGL2 + InstancedMesh"
}`,
      reproChecklist: [
        "先单独测试天空 curl-noise 流场着色器，确认旋涡动感自然",
        "锁定 4–5 个受限主色，禁止自由引入高饱和霓虹紫/绿破坏画风",
        "为弱 GPU 设备提供 DPR 上限 `Math.min(devicePixelRatio, 1.5)`",
      ],
    },
  },
  {
    id: "code-raytracer-alley",
    title: "零视频模型 · 纯代码光追赛博雨巷与深海漫游",
    subtitle: "不用 Sora / 视频扩散模型，全靠 SDF Ray-Marching 渲染电影级运镜",
    creator: "claude-motion / 社区 Shader 实验",
    sourceLabel: "claude-motion.com · Code-Rendered Cinema",
    sourceUrl: "https://github.com/liang8989/awesome-fable5-2-videos",
    category: "shaders-motion",
    effort: "max",
    horizon: "纯数学 SDF 渲染管线",
    verifiedDate: "2026-11",
    featured: false,
    schematic: "raymarch-alley",
    tags: ["SDF", "Ray-Marching", "Volumetric", "Zero-Diffusion"],
    summary:
      "不依赖任何抽卡式视频大模型，Fable 5.2 直接手写有向距离场（SDF）光线步进与体积雨雾着色器，实现物理精确、可随时改镜头和分辨率的电影级程序化短片。",
    quickPeek: {
      promptCore:
        "要求以时间参数 `uTime` 驱动确定性运镜脚本，输出可实时交互调参的 WebGL2 / Remotion 代码镜头。",
      breakthrough:
        "相比 AI 视频抽卡，纯代码渲染拥有 100% 物理一致性、无限 4K/8K 清晰度，且改一个灯光色温只需改一行常量。",
    },
    deepDive: {
      whyItMatters:
        "在 AI 时代，设计师很容易陷入“抽卡式生图生视频”的不可控泥潭；代码级视觉（Code-to-Video）代表了更硬核、更可工程化复用的另一条前沿路线。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "湿滑镜面反射 + 霓虹体积光 + 无损运镜",
          detail:
            "镜头平稳穿过雨夜巷道或深海峡谷，地面水洼精准反射霓虹招牌与雨滴涟漪，帧与帧之间零闪烁、零形变。",
        },
        {
          step: "02 · 数学核心",
          title: "Signed Distance Field（SDF）布尔建模",
          detail:
            "通过域重复（Domain Repetition）无限延展建筑立面，配合菲涅尔反射与法线差分计算雨水波纹。",
        },
        {
          step: "03 · 工程输出",
          title: "可导出高清 MP4 的帧同步管线",
          detail:
            "固定时间步长 `t = frame / 60` 逐帧渲染导出，完全不受实时掉帧影响。",
        },
      ],
      takeaways: [
        "需要“精密科技感、数据动效、无限循环背景”时，纯代码渲染比视频扩散模型稳 10 倍。",
        "用 `uniform` 参数暴露镜头焦距、雾浓度和霓虹色温，让设计师能实时滑动精调。",
      ],
      promptSpec: `// SDF Ray-Marching 分层提示规范
scene: "Rainy cyberpunk back-alley with puddle reflections"
shader_passes:
  - Pass A: Domain-repeated brutalist facades + neon signage SDF
  - Pass B: Procedural ripple normal map on wet asphalt (puddle mask)
  - Pass C: Exponential height fog + ACES filmic tone mapping
camera_rail: "Deterministic spline parameterized by uTime in [0, 12s]"`,
      mcpConfig: `{
  "pipeline": "code-to-video-deterministic",
  "engine": "WebGL2 / Remotion",
  "resolution": "1920x1080@60fps",
  "model": "claude-fable-5-2",
  "effort": "max"
}`,
      reproChecklist: [
        "在片元着色器顶部设定安全迭代上限 `MAX_STEPS = 96` 防止显卡超时",
        "加入 ACES Filmic 色调映射，避免高光过曝发白",
        "提供 Pause/Scrub 时间轴滑块方便逐帧审查光影",
      ],
    },
  },
  {
    id: "higgsfield-3d-commerce",
    title: "交互式 3D 硬件/球鞋拆解展厅（Higgsfield MCP）",
    subtitle: "滚轮驱动零件爆炸分解、实时切换 PBR 材质与参数标注的商业官网",
    creator: "3D Web Engineering Showcase",
    sourceLabel: "MCP + Three.js Product Experience",
    sourceUrl: "https://github.com/fengyiqicoder/awesome-fable-5.2",
    category: "shaders-motion",
    effort: "high",
    horizon: "MCP 资产 + 交互前端联动",
    verifiedDate: "2026-11",
    featured: false,
    schematic: "exploded-3d",
    tags: ["Higgsfield MCP", "Exploded View", "PBR Shader", "Scrollytelling"],
    summary:
      "结合外部 3D/视觉 MCP 工具，Fable 5.2 构建出堪比 Apple 官网的交互式 3D 产品拆解页：支持自由旋转、一键零件爆炸展开、材质实时换肤与工程参数联动浮标。",
    quickPeek: {
      promptCore:
        "把产品页拆成“3D 场景状态机”与“滚动叙事进度 `progress ∈ [0,1]`”双向绑定，确保文案与镜头严丝合缝。",
      breakthrough:
        "把原本需要资深创意前端团队做 3 周的 3D 商业互动展厅，压缩到单人半天内完成高保真原型到代码上线。",
    },
    deepDive: {
      whyItMatters:
        "这正是 Stripe Web 理念的延伸：用可交互的实体/3D 隐喻替代干巴巴的参数表，让用户在“拧一拧、拆一拆”的过程中秒懂复杂产品。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "丝滑阻尼拆解 + 动态参数标线",
          detail:
            "点击不同结构层级或向下滚动页面，鞋底缓震层/硬件主板按物理轨迹平滑分离，同时对应右侧技术参数卡片高亮。",
        },
        {
          step: "02 · 交互工程",
          title: "材质预设与灯光棚分离",
          detail:
            "预设 Studio Softbox 环境贴图（HDRI），点击切换磨砂铝、碳纤维或透明亚克力材质时只更新 PBR uniform，零卡顿。",
        },
        {
          step: "03 · 无障碍与降级",
          title: "低端机自动退回静态拆解图",
          detail:
            "检测 WebGL 能力与 `prefers-reduced-motion`，在受限设备上平滑降级为清晰的分层静态图解。",
        },
      ],
      takeaways: [
        "永远把“相机关键帧”写成声明式数组（position / target / explodeFactor），方便人机协同调优。",
        "爆炸视图中给每个部件加阻尼插值（lerp/spring），质感瞬间提升一个量级。",
      ],
      promptSpec: `// 3D 产品拆解状态机设计
keyframes:
  - section: "overview",    explode: 0.0, camera: [3.2, 1.4, 4.0]
  - section: "chassis",     explode: 0.45, camera: [1.8, 2.2, 3.1]
  - section: "internals",   explode: 1.0, camera: [0.4, 1.1, 2.8]

materials:
  - id: "anodized-alu", roughness: 0.28, metalness: 0.88
  - id: "matte-slate",  roughness: 0.72, metalness: 0.08`,
      mcpConfig: `{
  "mcpServers": {
    "higgsfield": { "transport": "http", "capability": "3d-asset-render" }
  },
  "frontend": "Three.js + CSS Scroll-Driven Progress",
  "model": "claude-fable-5-2"
}`,
      reproChecklist: [
        "建立统一的部件命名规范（`part_shell`, `part_core`, `part_pcb`）",
        "为爆炸向量设置独立方向与缓动系数，避免零件彼此穿插",
        "确保所有 3D 标注提供键盘可聚焦的文本面板作为无障碍替代",
      ],
    },
  },
  {
    id: "blender-mocap-rigging",
    title: "Blender 自动骨骼绑定与 CMU 动捕重定向流水线",
    subtitle: "用 Fable 5.2 生成零手动调帧的角色绑定脚本、动捕映射与机位预演",
    creator: "3D Technical Artist Community",
    sourceLabel: "Leadde Open Lab / awesome-fable5-2-videos",
    sourceUrl: "https://github.com/liang8989/awesome-fable5-2-videos",
    category: "blender-mcp",
    effort: "high",
    horizon: "可复用 Python DCC 工具链",
    verifiedDate: "2026-11",
    featured: false,
    schematic: "mocap-rig",
    tags: ["Rigging", "CMU Mocap", "Blender Python", "Previz"],
    summary:
      "针对 3D 动画最枯燥的绑骨与动捕清理环节，Fable 5.2 编写端到端 Blender Python 管线：自动识别网格关节、导入重定向 CMU 动捕数据并输出多机位灰模预演。",
    quickPeek: {
      promptCore:
        "要求先读取目标骨架的 Rest Pose 矩阵和骨骼命名表，再输出显式映射字典，严禁硬编码猜关节名。",
      breakthrough:
        "把高度依赖经验的 Rigging 脏活累活工程化、脚本化，让个人创作者也能拥有工作室级动画预演效率。",
    },
    deepDive: {
      whyItMatters:
        "这是 AI Design Engineering 极具含金量的实用方向：不炫技，而是专门消灭创意管线里最耗时的重复技术摩擦。",
      stages: [
        {
          step: "01 · 表面体验",
          title: "一键跑通绑骨到预演成片",
          detail:
            "导入静态角色网格和 BVH 动捕文件后，自动生成权重、修复足部滑步并建立三点布光预演镜头。",
        },
        {
          step: "02 · 矩阵防错",
          title: "先自检骨骼轴向再写重定向",
          detail:
            "先跑探针脚本打印源骨架与目标骨架的局部坐标系（Y-up vs Z-up），消除 90% 的扭曲变形 Bug。",
        },
        {
          step: "03 · 模块化交付",
          title: "沉淀为可重复运行的 Blender 插件",
          detail:
            "把一次性脚本重构为带 UI 面板的 Blender Add-on，从此一键复用。",
        },
      ],
      takeaways: [
        "涉及三维矩阵与坐标系转换时，必须让 Agent 先跑“探针诊断脚本”拿真实数据，再写正式代码。",
      ],
      promptSpec: `// 两阶段稳健重定向流程
phase_1_probe:
  - Inspect armature bone hierarchy, roll angles, and world matrix
  - Output JSON bone_map linking CMU BVH names -> Target Rig names

phase_2_retarget:
  - Apply Quaternion delta mapping with hip height normalization
  - Add foot-contact floor constraint to eliminate sliding
  - Setup 35mm / 85mm previz camera cuts`,
      mcpConfig: `{
  "tool": "blender-python-pipeline",
  "input": ["character.glb", "cmu_07_01.bvh"],
  "output": ["rigged_previz.blend", "camera_cuts.mp4"],
  "model": "claude-fable-5-2"
}`,
      reproChecklist: [
        "确保角色模型在绑定前处于标准 T-Pose / A-Pose 且缩放已 Apply (1,1,1)",
        "保留探针日志，便于快速定位翻转异常的单根骨骼",
      ],
    },
  },
  {
    id: "wine-legacy-arch-port",
    title: "底层系统硬骨头 · 跨代码库冷门架构 Wine 移植实验",
    subtitle: "不偷懒、不造假测试，连续数小时啃穿底层编译与 ABI 兼容难题",
    creator: "Hacker News / Systems Engineers",
    sourceLabel: "news.ycombinator.com · Long-Horizon Engineering",
    sourceUrl: "https://news.ycombinator.com/",
    category: "systems-arch",
    effort: "max",
    horizon: "数小时跨仓系统攻关",
    verifiedDate: "2026-11",
    featured: false,
    schematic: "sys-port",
    tags: ["Systems", "C / ABI", "Migration", "Zero-Shortcut"],
    summary:
      "系统工程师实测将 Wine 兼容层向冷门/老旧平台移植：Fable 5.2 在面对复杂头文件冲突与系统调用差异时拒绝“注释掉报错凑合过”，展现出极强的工程诚实度与持久规划力。",
    quickPeek: {
      promptCore:
        "建立硬性测试门禁（真实编译 + 系统调用回归测试），显式禁止任何 mock/skip/放宽断言的捷径。",
      breakthrough:
        "验证了 1M 上下文 + Adaptive Thinking 在真正高难度底层软件迁移中的价值：能记住 50 轮之前改过的头文件约定。",
    },
    deepDive: {
      whyItMatters:
        "很多模型写个炫酷前端很猛，但一进大型真实旧代码库就开始胡编 API、删测试用例骗通过。Fable 5.2 的真正差异化定位恰恰是这种“长程、严苛、不能作弊”的系统工程。",
      stages: [
        {
          step: "01 · 问题规模",
          title: "数十万行跨平台 C 代码与 ABI 映射",
          detail:
            "需要同时对齐调用约定、线程局部存储（TLS）、信号处理与动态链接器加载行为。",
        },
        {
          step: "02 · 规划先行",
          title: "先画依赖拓扑图再逐层解耦",
          detail:
            "Fable 5.2 先扫描编译树，列出最小可启动子集（ntdll / kernel32 最小桩），按依赖顺序逐个击破。",
        },
        {
          step: "03 · 验证闭环",
          title: "每个 Patch 必须配真实复现命令",
          detail:
            "所有修改都以编译退出码与真实最小二进制运行输出为唯一验收标准。",
        },
      ],
      takeaways: [
        "日常小改用轻量高速模型，但遇到“跨十几个模块、牵一发动全身”的迁移，切换到 Fable 5.2 (Max Effort) 的 ROI 极高。",
        "给 Agent 明确“反作弊条款（禁止跳过测试、禁止 stub 吞错）”是长程工程成败关键。",
      ],
      promptSpec: `// 长程系统迁移护栏（Anti-Shortcut Contract）
rules:
  - NEVER silence compiler warnings or disable failing test cases
  - Maintain MIGRATION_LOG.md tracking every ABI/syscall assumption
  - Break work into vertical slices verified by real binary execution
  - Escalate architectural trade-offs before touching >15 files`,
      mcpConfig: `{
  "mode": "long-horizon-systems-migration",
  "model": "claude-fable-5-2",
  "context_window": "1M",
  "pricing_ref": "$8/M in · $40/M out (cache read $0.20/M)"
}`,
      reproChecklist: [
        "优先启用 Prompt Caching（缓存读取仅 $0.20/M，长仓阅读成本暴降）",
        "每个里程碑生成结构化进度快照，确保上下文始终聚焦当前关键路径",
      ],
    },
  },
  {
    id: "oh-my-fable-orchestrator",
    title: "oh-my-fable & fable-baton · 多模型总控与商业流去噪",
    subtitle: "把 Fable 5.2 当“首席架构师”，把具体编码执行接力给低成本高速模型",
    creator: "Open-Source Agent Ecosystem",
    sourceLabel: "GitHub · oh-my-fable / fable-baton",
    sourceUrl: "https://github.com/topics/fable-5-2",
    category: "systems-arch",
    effort: "medium",
    horizon: "高性价比多 Agent 路由",
    verifiedDate: "2026-11",
    featured: false,
    schematic: "orchestrator-graph",
    tags: ["Orchestration", "Multi-Model", "Token Economy", "Workflow"],
    summary:
      "社区最实用的工程范式：不用 Fable 5.2 去干每一行体力活，而是让它负责全局需求拆解、商业流程去芜存菁（Decluttering）与架构审稿，再像接力棒一样把子任务派发给高速模型执行。",
    quickPeek: {
      promptCore:
        "建立“Planner（Fable 5.2）→ Executor（高速编码模型）→ Reviewer（Fable 5.2）”三段接力协议，质量拉满、账单砍半。",
      breakthrough:
        "把 $8/$40 的前沿大脑精准用在刀刃上（规划、排雷、收口验收），把 Token 性价比推到极致。",
    },
    deepDive: {
      whyItMatters:
        "AI 时代真正的工程高手不是无脑全开最贵模型，而是懂得按任务难度设计模型路由——这也是把个人设计库（`DESIGN.md`）规模化运转的最佳拍档。",
      stages: [
        {
          step: "01 · 架构规划层",
          title: "Fable 5.2 输出冻结的契约与验收标准",
          detail:
            "读取完整业务文档、混乱的 Drive 文件树或旧仓库，输出清晰的接口契约、`DESIGN.md` 边界与子任务拆解表。",
        },
        {
          step: "02 · 并发执行层",
          title: "子 Agent 并行落地各模块",
          detail:
            "各执行器拿着精确契约并行写代码、写样式、跑单测，互不干扰。",
        },
        {
          step: "03 · 终审收口层",
          title: "Fable 5.2 做跨模块一致性总审",
          detail:
            "汇总全部 Diff 和视觉截屏，专门抓边缘 Case、架构漂移和交互违和点。",
        },
      ],
      takeaways: [
        "设计好清晰的交接契约（接口定义 + `DESIGN.md` + 验收命令），弱一档的执行模型也能打出 90 分产出。",
        "善用 Context Caching，让架构师角色在多轮审稿中几乎零重复输入开销。",
      ],
      promptSpec: `// Baton 接力编排协议
planner:
  model: "claude-fable-5-2"
  effort: "high"
  output: ["SPEC.md", "DESIGN.md", "tasks.json"]

workers:
  concurrency: 3
  contract: "Must obey DESIGN.md tokens & pass verification command"

final_gate:
  model: "claude-fable-5-2"
  checks: ["cross-module consistency", "visual regression", "zero dead code"]`,
      mcpConfig: `{
  "orchestrator": "fable-baton",
  "plannerModel": "claude-fable-5-2",
  "cacheStrategy": "ephemeral-prefix-pinning",
  "estimatedCostSavings": "55% - 70% vs single-model full run"
}`,
      reproChecklist: [
        "先把“需要深度思考的决策”和“按规矩照做的实现”切分清楚",
        "给每个接力任务附上机器可验证的完成判据，杜绝口头汇报成功",
      ],
    },
  },
];

export const HERO_PRESETS = [
  {
    id: "saltline",
    tab: "Saltline FPS",
    badge: "3D / 1.4MB 单文件",
    workId: "saltline-fps",
    endpoint: "POST /v1/messages · effort=max",
    metrics: [
      { label: "输出规模", value: "1.4 MB HTML" },
      { label: "外部素材", value: "0 URLs" },
      { label: "渲染帧率", value: "60 FPS" },
    ],
    code: `<span class="tok-cm">// 单 Prompt 生成零素材 3D 第一人称射击游戏</span>
<span class="tok-kw">const</span> artifact = <span class="tok-kw">await</span> claude.messages.<span class="tok-fn">create</span>({
  model: <span class="tok-str">"claude-fable-5-2"</span>,
  max_tokens: <span class="tok-num">96000</span>,
  thinking: { type: <span class="tok-str">"adaptive"</span>, effort: <span class="tok-str">"max"</span> },
  constraints: [
    <span class="tok-str">"Single-file Three.js + Procedural Canvas Textures"</span>,
    <span class="tok-str">"Web Audio API Rain & Weapon Synthesizer"</span>,
    <span class="tok-str">"Drone Flanking AI + Quadruped Mech Physics"</span>
  ]
});`,
  },
  {
    id: "blender",
    tab: "Blender MCP 短片",
    badge: "6h 自主导演",
    workId: "blender-mcp-6h-film",
    endpoint: "MCP · blender://execute_python",
    metrics: [
      { label: "自主时长", value: "6 Hours" },
      { label: "人类基础", value: "0 3D 经验" },
      { label: "纠错方式", value: "视觉自检闭环" },
    ],
    code: `<span class="tok-cm">// 挂载 Blender MCP：写脚本 -> 渲预演 -> 视觉审片</span>
<span class="tok-kw">for</span> (<span class="tok-kw">const</span> shot <span class="tok-kw">of</span> storyboard.shots) {
  <span class="tok-kw">await</span> mcp.blender.<span class="tok-fn">runBpy</span>(shot.sceneScript);
  <span class="tok-kw">const</span> img = <span class="tok-kw">await</span> mcp.blender.<span class="tok-fn">preview</span>({ samples: <span class="tok-num">16</span> });
  <span class="tok-kw">const</span> ok = <span class="tok-kw">await</span> fable.<span class="tok-fn">critique</span>(img, shot.rules);
  <span class="tok-kw">if</span> (ok) <span class="tok-kw">await</span> mcp.blender.<span class="tok-fn">checkpoint</span>(shot.id);
}`,
  },
  {
    id: "starry",
    tab: "Starry Night 游戏",
    badge: "GLSL 油画流场",
    workId: "starry-night-rider",
    endpoint: "GLSL · curl_noise_impasto.frag",
    metrics: [
      { label: "画风驱动", value: "数学流场" },
      { label: "笔触实例", value: "2,400 Quads" },
      { label: "色域锁死", value: "4 梵高主色" },
    ],
    code: `<span class="tok-cm">// 将“梵高油画感”翻译为可执行着色器约束</span>
<span class="tok-kw">vec2</span> swirl = <span class="tok-fn">curlNoise</span>(uv * <span class="tok-num">3.4</span> + uTime * <span class="tok-num">0.18</span>);
<span class="tok-kw">vec3</span> pigment = <span class="tok-fn">mix</span>(PRUSSIAN_BLUE, COBALT_SWIRL, swirl.x);
pigment += <span class="tok-fn">starHalo</span>(uv, CADMIUM_YELLOW) * <span class="tok-num">1.35</span>;
<span class="tok-cm">// 严格限制受控色盘，杜绝廉价 AI 霓虹紫溢色</span>
fragColor = <span class="tok-kw">vec4</span>(<span class="tok-fn">acesFilmic</span>(pigment), <span class="tok-num">1.0</span>);`,
  },
];

export const ANATOMY_LAYERS = [
  {
    id: "layer-constraints",
    step: "01",
    title: "用硬约束替代空洞赞美",
    eyebrow: "CONSTRAINT ENGINEERING",
    summary:
      "顶级作品从不说“帮我做一个很酷的游戏/网站”，而是先锁死边界：零外部死链素材、固定物理步长、明确 `DESIGN.md` 色板与黑名单。",
    impact: "AI 味降低 90%",
    filename: "01-constraints.yaml",
    code: `<span class="tok-cm"># 顶级 Fable 5.2 作品的共性第 1 条：先写“禁止清单”</span>
<span class="tok-key">visual_contract</span>: <span class="tok-str">"design-vault/stripe-02/DESIGN.md"</span>
<span class="tok-key">asset_policy</span>:
  <span class="tok-key">external_urls</span>: <span class="tok-num">false</span>          <span class="tok-cm"># 逼出程序化几何与 Canvas 贴图</span>
  <span class="tok-key">audio_engine</span>: <span class="tok-str">"web-audio-synth"</span>
<span class="tok-key">anti_slop_blacklist</span>:
  - <span class="tok-str">"no generic purple-to-pink glowing cards"</span>
  - <span class="tok-str">"no pure #000000 body background"</span>
  - <span class="tok-str">"no unverified placeholder links"</span>`,
  },
  {
    id: "layer-effort",
    step: "02",
    title: "按任务复杂度精准拨动 Effort",
    eyebrow: "ADAPTIVE THINKING",
    summary:
      "Claude Fable 5.2 拥有 1M 上下文与 128K 输出，但不是每步都需要最高推理深度。架构定盘开 `max`，常规页面开 `high`，批量填充用 `medium` 配合缓存。",
    impact: "速度 +30% · 成本降半",
    filename: "02-adaptive-effort.ts",
    code: `<span class="tok-cm">// 按工程阶段动态调节思考预算（Fable 5.2 官方最佳实践）</span>
<span class="tok-kw">export const</span> EFFORT_POLICY = {
  architecture_and_tokens: { effort: <span class="tok-str">"max"</span>,    cache: <span class="tok-num">true</span> },
  interactive_components:  { effort: <span class="tok-str">"high"</span>,   cache: <span class="tok-num">true</span> },
  content_and_copy_batch:  { effort: <span class="tok-str">"medium"</span>, cache: <span class="tok-num">true</span> },
} <span class="tok-kw">as const</span>;

<span class="tok-cm">// 定价锚点：$8/M input · $40/M output · $0.20/M cache read</span>`,
  },
  {
    id: "layer-mcp",
    step: "03",
    title: "接通真实工具与 MCP 执行闭环",
    eyebrow: "TOOL & MCP ORCHESTRATION",
    summary:
      "从纯文本问答跃迁到设计工程的分水岭：通过 MCP 把 Blender、Figma、本地浏览器或文件系统交给 Agent，让它直接操作真实世界而非纸上谈兵。",
    impact: "跨软件自主交付",
    filename: "03-mcp-bridge.json",
    code: `{
  <span class="tok-key">"mcpServers"</span>: {
    <span class="tok-key">"figma"</span>:   { <span class="tok-key">"role"</span>: <span class="tok-str">"Read live tokens & Code Connect maps"</span> },
    <span class="tok-key">"blender"</span>: { <span class="tok-key">"role"</span>: <span class="tok-str">"Execute bpy scripts & render check frames"</span> },
    <span class="tok-key">"browser"</span>: { <span class="tok-key">"role"</span>: <span class="tok-str">"Open localhost, inspect layout & contrast"</span> }
  },
  <span class="tok-key">"checkpointing"</span>: <span class="tok-str">"atomic-save-per-verified-milestone"</span>
}`,
  },
  {
    id: "layer-verify",
    step: "04",
    title: "睁眼验收：视觉自检循环",
    eyebrow: "VISUAL VERIFICATION LOOP",
    summary:
      "永远不信 AI 嘴上说的“我改好了”。要求 Agent 自己起本地服务、在真实浏览器截屏、对照 `DESIGN.md` 查溢出/对齐/对比度，发现丑陋立刻返工。",
    impact: "交付质量稳居 85+",
    filename: "04-visual-gate.ts",
    code: `<span class="tok-cm">// 2026 前沿防翻车门禁：先渲染看图，再宣称完成</span>
<span class="tok-kw">const</span> audit = <span class="tok-kw">await</span> browserAgent.<span class="tok-fn">verify</span>(<span class="tok-str">"http://localhost:4173"</span>, {
  viewports: [<span class="tok-str">"1440x900"</span>, <span class="tok-str">"390x844"</span>],
  assertions: [
    <span class="tok-str">"zero horizontal overflow"</span>,
    <span class="tok-str">"modal opens with Esc & backdrop light-dismiss"</span>,
    <span class="tok-str">"WCAG AA contrast >= 4.5:1 on all body text"</span>
  ]
});`,
  },
];

export const PRESS_INDEX = [
  {
    volume: "VOL. 01 · CURATED LIST",
    title: "awesome-fable-5.2",
    author: "fengyiqicoder · GitHub",
    accent: "#635BFF",
    note: "追踪数百个可直接浏览器打开运行的 Claude Fable 5.2 游戏、3D 世界与网页实验，附原 Prompt 与作者署名。",
    url: "https://github.com/fengyiqicoder/awesome-fable-5.2",
  },
  {
    volume: "VOL. 02 · CODE-TO-VIDEO",
    title: "awesome-fable5-2-videos",
    author: "VibeClip / liang8989 · GitHub",
    accent: "#00A67E",
    note: "专注非视频扩散路线的纯代码动效、Blender 脚本渲染与 Remotion 动态信息图作品合集。",
    url: "https://github.com/liang8989/awesome-fable5-2-videos",
  },
  {
    volume: "VOL. 03 · REFERENCE ARTIFACT",
    title: "Saltline · Single-Prompt FPS",
    author: "Felix Rieseberg / realcodebear",
    accent: "#E07A00",
    note: "1.4MB 单文件浏览器 FPS 源码镜像：研究 Fable 5.2 如何在零外部素材下维持完整游戏工程结构的必读样本。",
    url: "https://github.com/realcodebear/saltline-fable-5.2",
  },
  {
    volume: "VOL. 04 · DESIGN STANDARD",
    title: "02 · Stripe DESIGN.md 母本",
    author: "本站内置 · 本地开源协议",
    accent: "#0A2540",
    note: "本网站实时运行的底层视觉契约与 Tier 1–4 CSS Token 文件，可直接复制到你的下一个 AI Agent 项目复用。",
    url: "#design-vault",
  },
];
