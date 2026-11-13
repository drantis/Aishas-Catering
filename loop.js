(function () {
  const canvas = document.querySelector("[data-loop-canvas]");
  if (!canvas) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");
  let w = 0;
  let h = 0;
  let raf = 0;
  let start = performance.now();

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function orb(x, y, r, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function frame(now) {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);

    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, "#1a120e");
    base.addColorStop(0.45, "#24180f");
    base.addColorStop(1, "#120d0a");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // Slow drifting “steam / ember” orbs — infinite NFT-loop energy
    orb(
      w * (0.62 + Math.sin(t * 0.22) * 0.08),
      h * (0.28 + Math.cos(t * 0.18) * 0.06),
      Math.max(w, h) * 0.42,
      "rgba(232,163,90,0.20)"
    );
    orb(
      w * (0.22 + Math.cos(t * 0.15) * 0.07),
      h * (0.62 + Math.sin(t * 0.2) * 0.05),
      Math.max(w, h) * 0.34,
      "rgba(196,120,47,0.16)"
    );
    orb(
      w * (0.78 + Math.sin(t * 0.11 + 1.2) * 0.05),
      h * (0.72 + Math.cos(t * 0.13) * 0.04),
      Math.max(w, h) * 0.28,
      "rgba(255,210,150,0.08)"
    );

    // Soft vertical light sweep looping forever
    const sweepX = ((t * 40) % (w + 240)) - 120;
    const sweep = ctx.createLinearGradient(sweepX, 0, sweepX + 180, 0);
    sweep.addColorStop(0, "rgba(255,255,255,0)");
    sweep.addColorStop(0.5, "rgba(255,220,180,0.06)");
    sweep.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sweep;
    ctx.fillRect(0, 0, w, h);

    // Floating particulate
    for (let i = 0; i < 28; i++) {
      const seed = i * 97.13;
      const x = (Math.sin(t * 0.13 + seed) * 0.5 + 0.5) * w;
      const y = ((t * (8 + (i % 5)) + seed * 20) % (h + 40)) - 20;
      const r = 1 + (i % 3);
      ctx.fillStyle = `rgba(244,235,227,${0.08 + (i % 4) * 0.03})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thin ring motif — luxury loop mark
    const cx = w * 0.72;
    const cy = h * 0.38;
    const radius = Math.min(w, h) * 0.18;
    ctx.strokeStyle = "rgba(232,163,90,0.28)";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, t * 0.35, t * 0.35 + Math.PI * 1.4);
    ctx.stroke();
    ctx.strokeStyle = "rgba(244,235,227,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.28, -t * 0.25, -t * 0.25 + Math.PI * 1.1);
    ctx.stroke();

    if (!reduce) raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reduce) frame(performance.now());
  });

  if (reduce) {
    frame(performance.now());
  } else {
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener("pagehide", () => cancelAnimationFrame(raf));
})();
