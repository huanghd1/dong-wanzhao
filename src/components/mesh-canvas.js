// Smooth organic Stripe-style multi-stop living mesh gradient canvas
// Respects prefers-reduced-motion and automatically pauses when scrolled offscreen

export function initStripeMesh(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Authentic Stripe chromatic palette (Blurple, Cyan, Warm Coral, Solar Amber, Deep Indigo)
  const blobs = [
    { x: 0.14, y: 0.24, r: 0.62, color: "rgba(99, 91, 255, 0.94)", sx: 0.23, sy: 0.17, px: 0.0, py: 0.7 },
    { x: 0.84, y: 0.20, r: 0.56, color: "rgba(0, 212, 255, 0.88)", sx: 0.19, sy: 0.25, px: 1.8, py: 0.3 },
    { x: 0.54, y: 0.44, r: 0.58, color: "rgba(255, 90, 95, 0.86)", sx: 0.21, sy: 0.14, px: 3.1, py: 2.2 },
    { x: 0.72, y: 0.62, r: 0.56, color: "rgba(255, 203, 87, 0.90)", sx: 0.16, sy: 0.22, px: 4.4, py: 1.1 },
    { x: 0.28, y: 0.74, r: 0.52, color: "rgba(122, 115, 255, 0.84)", sx: 0.18, sy: 0.19, px: 2.4, py: 4.1 },
  ];

  let width = 0;
  let height = 0;
  let rafId = null;
  let isVisible = true;
  let startTime = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    // Low internal resolution scaled smoothly = ultra-silky organic blur & near-zero GPU cost
    const scale = 0.28;
    width = Math.max(240, Math.round(rect.width * scale));
    height = Math.max(160, Math.round(rect.height * scale));
    canvas.width = width;
    canvas.height = height;
    drawFrame(reducedMotion.matches ? 0 : (performance.now() - startTime) * 0.00035);
  }

  function drawFrame(t) {
    // Rich luminous base
    const baseGrad = ctx.createLinearGradient(0, 0, width, height);
    baseGrad.addColorStop(0, "#4338CA");
    baseGrad.addColorStop(0.45, "#635BFF");
    baseGrad.addColorStop(1, "#00A8E8");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "screen";
    const maxDim = Math.max(width, height);

    for (const b of blobs) {
      const cx = (b.x + Math.sin(t * b.sx * 4 + b.px) * 0.14) * width;
      const cy = (b.y + Math.cos(t * b.sy * 4 + b.py) * 0.14) * height;
      const radius = b.r * maxDim;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, b.color);
      grad.addColorStop(0.55, b.color.replace(/[\d.]+\)$/, "0.28)"));
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function tick(now) {
    if (!isVisible || reducedMotion.matches) {
      rafId = null;
      return;
    }
    const t = (now - startTime) * 0.00032;
    drawFrame(t);
    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (!rafId && isVisible && !reducedMotion.matches) {
      rafId = requestAnimationFrame(tick);
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const io = new IntersectionObserver(
    (entries) => {
      isVisible = entries[0]?.isIntersecting ?? true;
      if (isVisible) start();
      else if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    { threshold: 0.02 }
  );
  io.observe(canvas);

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      drawFrame(0);
    } else {
      start();
    }
  });

  resize();
  start();
}
