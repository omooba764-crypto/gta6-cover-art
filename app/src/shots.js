// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone. `photo` picks the sample
// (samples/<photo>.jpg), `caption` and `subtitle` the words, `layout`, `grade`
// and `size` pick the cover. window.__shotReady is set once painted.
export async function runShot(shot, query, state, load, redraw) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) {
    state.size = query.get('size');
    const sel = document.getElementById('size');
    if (sel) sel.value = state.size;
  }
  // Give every panel a photo: alternate the two samples so multi-panel
  // layouts show both, with a little zoom on the small panels.
  const first = `samples/${query.get('photo') ?? 'pier'}.jpg`;
  const second = `samples/${query.get('photo') === 'pier' ? 'boulevard' : 'pier'}.jpg`;
  await load(first, query.get('caption') ?? 'Sunset Heist', query.get('subtitle') ?? 'VICE CITY');
  await load(second, query.get('caption') ?? 'Sunset Heist', query.get('subtitle') ?? 'VICE CITY');
  state.panels = [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.15, ox: 0.05, oy: 0 },
    { photo: 1, zoom: 1.15, ox: -0.05, oy: 0 },
  ];
  // Redraw once more with the panels assigned, then signal readiness.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (redraw) redraw();
    window.__shotReady = true;
    document.dispatchEvent(new Event('viceframe:shot-ready'));
  }));
}
