"use strict";

// AB001 hazard visibility fix. Loaded after hero-art.js.
// The moving Haran hazards previously rendered as faint broken-cart/triangle shapes.
// Render BOTH those moving "cart" hazards and later dust hazards as large visible dust devils.
(() => {
  const previousDrawHazard = drawHazard;

  function drawDustDevil(h, now) {
    const x = (h.c + 0.5) * tile;
    const y = (h.r - cameraTop + 0.5) * tile;
    if (y < -tile * 2 || y > ch + tile * 2) return;

    const sway = Math.sin((h.t || 0) * 2.3 + now * 0.0028) * tile * 0.09;
    const spin = now * 0.004 + (h.t || 0);
    const w = tile * 1.34;
    const hgt = tile * 1.74;

    ctx.save();
    ctx.translate(x + sway, y);

    // Strong halo so the hazard can never disappear into the tan floor.
    const halo = ctx.createRadialGradient(0, 0, tile * 0.1, 0, 0, tile * 1.0);
    halo.addColorStop(0, "rgba(255,236,168,.42)");
    halo.addColorStop(.58, "rgba(175,104,32,.34)");
    halo.addColorStop(1, "rgba(93,48,13,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, 0, tile * 1.0, tile * 1.03, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark ground shadow + dust cloud.
    ctx.fillStyle = "rgba(74,40,12,.34)";
    ctx.beginPath();
    ctx.ellipse(0, hgt * .42, w * .48, hgt * .12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 9 * dpr;
    ctx.shadowColor = "rgba(77,41,12,.5)";
    ctx.fillStyle = "rgba(139,79,25,.72)";
    ctx.beginPath();
    ctx.ellipse(0, hgt * .38, w * .43, hgt * .10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(229,177,91,.80)";
    ctx.beginPath();
    ctx.ellipse(-w * .16, hgt * .37, w * .27, hgt * .075, 0, 0, Math.PI * 2);
    ctx.ellipse(w * .16, hgt * .38, w * .25, hgt * .07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Big filled tornado bands, matching the visible tornado artwork concept.
    const bands = [
      {yy:-.39, rx:.47, ry:.118, off:.02},
      {yy:-.25, rx:.40, ry:.108, off:-.07},
      {yy:-.11, rx:.34, ry:.100, off:.05},
      {yy:.03,  rx:.28, ry:.090, off:-.04},
      {yy:.17,  rx:.22, ry:.080, off:.03},
      {yy:.29,  rx:.16, ry:.068, off:-.02}
    ];

    bands.forEach((b, i) => {
      const wobble = Math.sin(spin * 1.7 + i * 1.2) * w * .05;
      const yy = b.yy * hgt;
      const xx = b.off * w + wobble;
      const grad = ctx.createLinearGradient(xx - w * b.rx, yy, xx + w * b.rx, yy);
      grad.addColorStop(0, "#6d3b12");
      grad.addColorStop(.20, "#a96325");
      grad.addColorStop(.50, "#e7b45c");
      grad.addColorStop(.78, "#ad6525");
      grad.addColorStop(1, "#63330f");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(61,31,8,.98)";
      ctx.lineWidth = Math.max(2 * dpr, tile * .042);
      ctx.beginPath();
      ctx.ellipse(xx, yy, w * b.rx, hgt * b.ry, Math.sin(spin + i) * .055, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,231,158,.88)";
      ctx.lineWidth = Math.max(1.2 * dpr, tile * .025);
      ctx.beginPath();
      ctx.ellipse(xx - w * .02, yy - hgt * b.ry * .18, w * b.rx * .78, hgt * b.ry * .47, 0, Math.PI * 1.08, Math.PI * 1.88);
      ctx.stroke();
    });

    // Funnel stem.
    const funnel = ctx.createLinearGradient(-w * .12, 0, w * .12, 0);
    funnel.addColorStop(0, "#64330f");
    funnel.addColorStop(.5, "#cf8732");
    funnel.addColorStop(1, "#5d2f0e");
    ctx.fillStyle = funnel;
    ctx.strokeStyle = "rgba(57,28,7,.96)";
    ctx.lineWidth = Math.max(1.8 * dpr, tile * .036);
    ctx.beginPath();
    ctx.moveTo(-w * .16, hgt * .22);
    ctx.quadraticCurveTo(w * .12, hgt * .30, w * .055, hgt * .39);
    ctx.lineTo(-w * .055, hgt * .39);
    ctx.quadraticCurveTo(-w * .11, hgt * .30, -w * .16, hgt * .22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flying debris makes it obvious the object is moving and dangerous.
    for (let i = 0; i < 12; i++) {
      const a = spin * (i % 2 ? 1.25 : -1.1) + i * .68;
      const radius = w * (.46 + (i % 3) * .08);
      const px = Math.cos(a) * radius;
      const py = Math.sin(a * .78) * hgt * .30 + (i % 2 ? -hgt * .06 : hgt * .08);
      ctx.fillStyle = i % 3 === 0 ? "#5d3414" : "#b9732d";
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2.2 * dpr, tile * (.038 + (i % 2) * .012)), 0, Math.PI * 2);
      ctx.fill();
    }

    // Bright danger ring remains visible over busy wall textures.
    ctx.strokeStyle = "rgba(255,226,108,.92)";
    ctx.lineWidth = Math.max(2 * dpr, tile * .034);
    ctx.setLineDash([tile * .14, tile * .09]);
    ctx.beginPath();
    ctx.ellipse(0, hgt * .04, w * .64, hgt * .50, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  drawHazard = function(h, now) {
    if (mode === "hero" && h && (h.type === "cart" || h.type === "dust")) {
      drawDustDevil(h, now);
      return;
    }
    previousDrawHazard(h, now);
  };
})();
