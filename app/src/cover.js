// Vice Frame cover renderer: draws the multi-panel GTA-poster-style cover onto a
// canvas. Every letter, sun and stripe here is drawn by this file — no
// Rockstar Games logo, artwork or font is used, and the only typeface is the
// browser's own bold system sans-serif, drawn in italic capitals.
//
// A cover is: 1–4 photo panels with white gutters, a Vice City sunset or neon
// colour grade over each photo, a drawn retro sun and palm silhouette, and a big
// bold title with a subtitle bar. The same drawCover runs the on-screen preview
// and the exported PNG, so what you see is what the file holds.

export const LAYOUTS = {
  hero: { panels: 3, label: 'Hero + 2' },
  grid: { panels: 4, label: 'Grid 2×2' },
  strip: { panels: 3, label: 'Strip ×3' },
  single: { panels: 1, label: 'Single' },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', accent: '#ff5e3a', accent2: '#ff7ad9' },
  neon: { label: 'Neon Nights', accent: '#ff2fb3', accent2: '#22d3ee' },
  palm: { label: 'Palm Gold', accent: '#ffc53d', accent2: '#0e9f8a' },
  noir: { label: 'Noir', accent: '#e8e8e8', accent2: '#5a5a6e' },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

/** Panel rectangles for a layout, as fractions of the cover, with white gutters. */
export function panelRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.014); // gutter
  if (layout === 'grid') {
    const pw = (w - 3 * g) / 2;
    const ph = (h - 3 * g) / 2;
    return [
      { x: g, y: g, w: pw, h: ph },
      { x: 2 * g + pw, y: g, w: pw, h: ph },
      { x: g, y: 2 * g + ph, w: pw, h: ph },
      { x: 2 * g + pw, y: 2 * g + ph, w: pw, h: ph },
    ];
  }
  if (layout === 'strip') {
    const pw = (w - 4 * g) / 3;
    return [0, 1, 2].map((i) => ({ x: g + i * (pw + g), y: g, w: pw, h: h - 2 * g }));
  }
  if (layout === 'single') return [{ x: g, y: g, w: w - 2 * g, h: h - 2 * g }];
  // hero: one large panel left, two stacked panels right
  const lw = Math.round(w * 0.6);
  const rw = w - lw - 3 * g;
  const rh = (h - 3 * g) / 2;
  return [
    { x: g, y: g, w: lw - g, h: h - 2 * g },
    { x: lw + g, y: g, w: rw, h: rh },
    { x: lw + g, y: 2 * g + rh, w: rw, h: rh },
  ];
}

/** Draws one photo into a panel, cover-fit, with the panel's zoom and offsets. */
export function drawPhotoInPanel(ctx, photo, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!photo) {
    const fallback = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    fallback.addColorStop(0, '#3a1c5c');
    fallback.addColorStop(1, '#12081f');
    ctx.fillStyle = fallback;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    if (grade === 'noir') ctx.filter = 'grayscale(0.85) contrast(1.15) brightness(0.95)';
    const zoom = panel?.zoom ?? 1;
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dx = rect.x + (rect.w - dw) / 2 + (panel?.ox ?? 0) * rect.w;
    const dy = rect.y + (rect.h - dh) / 2 + (panel?.oy ?? 0) * rect.h;
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  gradePhotoOverlay(ctx, rect, grade);
  ctx.restore();
}

/** The colour grade washed over one photo panel. */
export function gradePhotoOverlay(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  let tint;
  if (grade === 'neon') {
    tint = ctx.createLinearGradient(x, y, x + w, y + h);
    tint.addColorStop(0, 'rgba(255, 47, 179, 0.30)');
    tint.addColorStop(0.55, 'rgba(120, 40, 200, 0.12)');
    tint.addColorStop(1, 'rgba(34, 211, 238, 0.30)');
  } else if (grade === 'palm') {
    tint = ctx.createLinearGradient(x, y, x, y + h);
    tint.addColorStop(0, 'rgba(14, 159, 138, 0.22)');
    tint.addColorStop(1, 'rgba(255, 197, 61, 0.26)');
  } else if (grade === 'noir') {
    tint = ctx.createLinearGradient(x, y, x, y + h);
    tint.addColorStop(0, 'rgba(10, 10, 25, 0.10)');
    tint.addColorStop(1, 'rgba(10, 10, 25, 0.45)');
  } else {
    // sunset
    tint = ctx.createLinearGradient(x, y, x, y + h);
    tint.addColorStop(0, 'rgba(255, 190, 80, 0.10)');
    tint.addColorStop(0.55, 'rgba(255, 94, 58, 0.18)');
    tint.addColorStop(1, 'rgba(255, 122, 217, 0.38)');
  }
  ctx.fillStyle = tint;
  ctx.fillRect(x, y, w, h);
  // Vignette: darken the panel edges so the panels read as separate posters.
  const vig = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.35, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);
}

/** A retro striped sun, drawn with canvas shapes only. */
export function drawRetroSun(ctx, cx, cy, r) {
  const sun = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  sun.addColorStop(0, '#ffd23d');
  sun.addColorStop(0.55, '#ff7a3d');
  sun.addColorStop(1, '#ff2fb3');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = sun;
  ctx.fill();
  ctx.restore();
}

/** Three diagonal accent stripes in the cover's top-right corner. */
export function drawCornerStripes(ctx, w, h, grade) {
  const { accent, accent2 } = GRADES[grade] ?? GRADES.sunset;
  const colors = [accent, accent2, '#ffffff'];
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.88, 0, w * 0.12, h * 0.07);
  ctx.clip();
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    const x0 = w * (0.9 + i * 0.035);
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + w * 0.03, 0);
    ctx.lineTo(x0 + w * 0.03 - h * 0.07, h * 0.07);
    ctx.lineTo(x0 - h * 0.07, h * 0.07);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

/** The bold title and subtitle, drawn over the foot of the cover. */
export function drawTitleBlock(ctx, w, h, title, subtitle, grade) {
  const { accent, accent2 } = GRADES[grade] ?? GRADES.sunset;
  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    const pad = h * 0.012;
    const fs = h * 0.028;
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(sub).width + pad * 3;
    const bx = w * 0.045;
    const by = h * 0.045;
    ctx.fillStyle = 'rgba(10, 5, 20, 0.85)';
    ctx.fillRect(bx, by, tw, fs + pad * 1.6);
    ctx.fillStyle = accent2;
    ctx.fillRect(bx, by, h * 0.008, fs + pad * 1.6);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(sub, bx + pad * 1.6, by + (fs + pad * 1.6) / 2);
  }
  if (!text) return;
  // Shade the foot so white lettering reads over any photo.
  const shade = ctx.createLinearGradient(0, h * 0.62, 0, h);
  shade.addColorStop(0, 'rgba(10, 5, 20, 0)');
  shade.addColorStop(1, 'rgba(10, 5, 20, 0.72)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  let size = h * 0.115;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const fit = () => {
    ctx.font = `italic 900 ${size}px system-ui, sans-serif`;
    return ctx.measureText(text).width <= w * 0.92;
  };
  while (!fit() && size > h * 0.02) size -= 2;
  ctx.font = `italic 900 ${size}px system-ui, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch { /* older canvas: no letter spacing */ }
  const tx = w * 0.045;
  const ty = h - h * 0.055;
  ctx.shadowColor = accent;
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetX = size * 0.04;
  ctx.shadowOffsetY = size * 0.04;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = '#14081f';
  ctx.strokeText(text, tx, ty);
  ctx.shadowColor = 'rgba(0, 0, 0, 0)';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, tx, ty);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  // Neon underline under the title.
  ctx.fillStyle = accent;
  ctx.fillRect(tx, ty + h * 0.018, Math.min(w * 0.42, ctx.measureText(text).width * 0.55), h * 0.008);
  ctx.fillStyle = accent2;
  ctx.fillRect(tx, ty + h * 0.018, Math.min(w * 0.14, ctx.measureText(text).width * 0.18), h * 0.008);
}

/**
 * Draws the whole cover onto `canvas` at the size in `state.size`.
 * state: { layout, grade, title, subtitle, size, panels: [{ photo, zoom, ox, oy }] }
 * photos: array of HTMLImageElement (or null) in the order the library holds them.
 */
export function drawCover(canvas, state, photos) {
  const [w, h] = SIZES[state.size] ?? SIZES['1080x1080'];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff'; // white gutters between the panels
  ctx.fillRect(0, 0, w, h);
  const rects = panelRects(state.layout, w, h);
  const panels = state.panels ?? [];
  rects.forEach((rect, i) => {
    const panel = panels[i] ?? { photo: i % (photos.length || 1), zoom: 1, ox: 0, oy: 0 };
    drawPhotoInPanel(ctx, photos[panel.photo] ?? null, rect, panel, state.grade);
  });
  // Retro sun over the first panel, top-right, when the layout has room:
  // only when the first panel is wide, so the sun never crowds a face.
  if (state.layout !== 'single' && rects[0].w > w * 0.45) {
    const first = rects[0];
    const r = Math.min(first.w, first.h) * 0.15;
    drawRetroSun(ctx, first.x + first.w * 0.8, first.y + first.h * 0.16, r);
  }
  drawCornerStripes(ctx, w, h, state.grade);
  drawTitleBlock(ctx, w, h, state.title, state.subtitle, state.grade);
  // Thin black frame, the poster's edge.
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = Math.max(4, Math.round(w * 0.006));
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  return { width: w, height: h };
}
