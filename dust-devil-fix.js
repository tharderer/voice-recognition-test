"use strict";

// AB001 dust-devil visibility fix. Loaded after hero-art.js.
// This changes only the moving dust-devil hazard in the Hero Mission.
(() => {
  const previousDrawHazard = drawHazard;

  function drawDustDevil(h, now) {
    const x = (h.c + 0.5) * tile;
    const y = (h.r - cameraTop + 0.5) * tile;
    if (y < -tile * 2 || y > ch + tile * 2) return;

    const sway = Math.sin((h.t || 0) * 2.3 + now * 0.0028) * tile * 0.08;
    const spin = now * 0.004 + (h.t || 0);
    const w = tile * 1.22;
    const hgt = tile * 1.62;

    ctx.save();
    ctx.translate(x + sway, y);

    // Large soft dust halo makes the danger readable against the tan floor.
    const halo = ctx.createRadialGradient(0, 0, tile * 0.12, 0, 0, tile * 0.92);
    halo.addColorStop(0, "rgba(255,229,150,.28)");
    halo.addColorStop(.58, "rgba(179,112,39,.22)");
    halo.addColorStop(1, "rgba(112,62,20,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, 0, tile * 0.92, tile * 0.94, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground dust cloud.
    ctx.shadowBlur = 8 * dpr;
    ctx.shadowColor = "rgba(78,43,13,.45)";
    ctx.fillStyle = "rgba(133,76,26,.62)";
    ctx.beginPath();
    ctx.ellipse(0, hgt * .39, w * .42, hgt * .12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(226,174,91,.74)";
    ctx.beginPath();
    ctx.ellipse(-w * .13, hgt * .37, w * .28, hgt * .09, 0, 0, Math.PI * 2);
    ctx.ellipse(w * .16, hgt * .38, w * .26, hgt * .085, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Filled, outlined tornado bands based on the generated tornado concept.
    const bands = [
      {yy:-.39, rx:.46, ry:.115, off:.02},
      {yy:-.25, rx:.39, ry:.105, off:-.07},
      {yy:-.11, rx:.33, ry:.098, off:.05},
      {yy:.03,  rx:.27, ry:.088, off:-.04},
      {yy:.16,  rx:.21, ry:.078, off:.03},
      {yy:.28,  rx:.15, ry:.066, off:-.02}
    ];

    bands.forEach((b, i) => {
      const wobble = Math.sin(spin * 1.7 + i * 1.2) * w * .045;
      const yy = b.yy * hgt;
      const xx = (b.off * w) + wobble;
      const grad = ctx.createLinearGradient(xx - w * b.rx, yy, xx + w * b.rx, yy);
      grad.addColorStop(0, "#85501f");
      grad.addColorStop(.23, "#c88738");
      grad.addColorStop(.52, "#efc36e");
      grad.addColorStop(.78, "#ba712c");
      grad.addColorStop(1, "#704017");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "rgba(77,42,13,.9)";
      ctx.lineWidth = Math.max(1.5 * dpr, tile * .035);
      ctx.beginPath();
      ctx.ellipse(xx, yy, w * b.rx, hgt * b.ry, Math.sin(spin+i)*.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bright upper lip gives the cartoon spiral depth.
      ctx.strokeStyle = "rgba(255,222,145,.72)";
      ctx.lineWidth = Math.max(1 * dpr, tile * .022);
      ctx.beginPath();
      ctx.ellipse(xx - w * .025, yy - hgt * b.ry * .18, w * b.rx * .78, hgt * b.ry * .48, 0, Math.PI * 1.08, Math.PI * 1.88);
      ctx.stroke();
    });

    // Narrow visible funnel connecting the bands to the ground.
    const funnel = ctx.createLinearGradient(-w*.10, 0, w*.10, 0);
    funnel.addColorStop(0, "#754418");
    funnel.addColorStop(.5, "#d8943f");
    funnel.addColorStop(1, "#6c3d16");
    ctx.fillStyle = funnel;
    ctx.strokeStyle = "rgba(73,39,12,.88)";
    ctx.lineWidth = Math.max(1.4*dpr, tile*.03);
    ctx.beginPath();
    ctx.moveTo(-w*.15, hgt*.23);
    ctx.quadraticCurveTo(w*.11, hgt*.30, w*.055, hgt*.39);
    ctx.lineTo(-w*.055, hgt*.39);
    ctx.quadraticCurveTo(-w*.09, hgt*.30, -w*.15, hgt*.23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fast-moving rocks/dust around it, so the player instantly reads "moving hazard".
    for (let i = 0; i < 10; i++) {
      const a = spin * (i % 2 ? 1.2 : -1.05) + i * .78;
      const radius = w * (.43 + (i % 3) * .085);
      const px = Math.cos(a) * radius;
      const py = Math.sin(a * .78) * hgt * .29 + (i % 2 ? -hgt*.06 : hgt*.08);
      ctx.fillStyle = i % 3 === 0 ? "#6f421d" : "#c58439";
      ctx.beginPath();
      ctx.arc(px, py, Math.max(2*dpr, tile * (.035 + (i%2)*.012)), 0, Math.PI*2);
      ctx.fill();
    }

    // Warning ring stays visible even when the sprite crosses a busy maze tile.
    ctx.strokeStyle = "rgba(255,221,104,.72)";
    ctx.lineWidth = Math.max(1.5*dpr, tile*.028);
    ctx.setLineDash([tile*.12, tile*.09]);
    ctx.beginPath();
    ctx.ellipse(0, hgt*.05, w*.61, hgt*.48, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  drawHazard = function(h, now) {
    if (mode === "hero" && h && h.type === "dust") {
      drawDustDevil(h, now);
      return;
    }
    previousDrawHazard(h, now);
  };
})();
