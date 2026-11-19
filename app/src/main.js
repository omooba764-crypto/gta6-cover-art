// Vice Frame wiring: photos in, panels and grades chosen, PNG out.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
// Photos never leave this machine: uploads are read with object URLs only.
import { drawCover, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const caption = document.getElementById('caption');
const subtitle = document.getElementById('subtitle');
const sizeSelect = document.getElementById('size');
const status = document.getElementById('status');
const thumbs = document.getElementById('thumbs');
const panelsBox = document.getElementById('panels');
const zoomInput = document.getElementById('zoom');
const offsetXInput = document.getElementById('offsetX');
const offsetYInput = document.getElementById('offsetY');

// The photo library: sample photos first, then anything the person uploads.
const photos = [];
let state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'VICE CITY',
  size: '1080x1080',
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1.25, ox: 0, oy: 0 },
    { photo: 1, zoom: 1.25, ox: 0, oy: 0 },
  ],
};
let selectedPanel = 0;

function redraw() {
  drawCover(canvas, state, photos.map((p) => p.img));
}

function renderThumbs() {
  thumbs.innerHTML = '';
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = p.name;
    img.title = p.name;
    if (state.panels[selectedPanel]?.photo === i) img.classList.add('assigned');
    img.addEventListener('click', () => {
      state.panels[selectedPanel].photo = i;
      renderThumbs();
      renderPanelButtons();
      redraw();
    });
    thumbs.appendChild(img);
  });
}

function renderPanelButtons() {
  panelsBox.innerHTML = '';
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    if (i === selectedPanel) b.classList.add('active');
    b.addEventListener('click', () => {
      selectedPanel = i;
      const p = state.panels[i];
      zoomInput.value = String(p.zoom);
      offsetXInput.value = String(p.ox);
      offsetYInput.value = String(p.oy);
      renderThumbs();
      renderPanelButtons();
    });
    panelsBox.appendChild(b);
  }
}

function setLayout(layout) {
  state.layout = layout;
  selectedPanel = 0;
  document.querySelectorAll('#layouts .pill').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  renderPanelButtons();
  redraw();
}

function setGrade(grade) {
  state.grade = grade;
  document.querySelectorAll('#grades .pill').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(url, name) {
  const img = await loadImage(url);
  photos.push({ url, name, img });
  renderThumbs();
  redraw();
  return photos.length - 1;
}

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const index = await addPhoto(URL.createObjectURL(file), file.name);
    state.panels[selectedPanel].photo = index;
  }
  renderThumbs();
  renderPanelButtons();
  redraw();
});

document.getElementById('samplePier').addEventListener('click', async () => {
  const i = await addPhoto('samples/pier.jpg', 'Pier (sample)');
  state.panels[selectedPanel].photo = i;
  renderThumbs();
  redraw();
});
document.getElementById('sampleBoulevard').addEventListener('click', async () => {
  const i = await addPhoto('samples/boulevard.jpg', 'Boulevard (sample)');
  state.panels[selectedPanel].photo = i;
  renderThumbs();
  redraw();
});

document.querySelectorAll('#layouts .pill').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('#grades .pill').forEach((b) => b.addEventListener('click', () => setGrade(b.dataset.grade)));

zoomInput.addEventListener('input', () => { state.panels[selectedPanel].zoom = Number(zoomInput.value); redraw(); });
offsetXInput.addEventListener('input', () => { state.panels[selectedPanel].ox = Number(offsetXInput.value); redraw(); });
offsetYInput.addEventListener('input', () => { state.panels[selectedPanel].oy = Number(offsetYInput.value); redraw(); });

caption.addEventListener('input', () => { state.title = caption.value; redraw(); });
subtitle.addEventListener('input', () => { state.subtitle = subtitle.value; redraw(); });
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; redraw(); });

document.getElementById('shuffle').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  setLayout(layouts[Math.floor(Math.random() * layouts.length)]);
  setGrade(grades[Math.floor(Math.random() * grades.length)]);
  state.panels.forEach((p) => {
    p.photo = Math.floor(Math.random() * photos.length);
    p.zoom = 1 + Math.random() * 0.6;
    p.ox = (Math.random() - 0.5) * 0.3;
    p.oy = (Math.random() - 0.5) * 0.3;
  });
  renderThumbs();
  redraw();
  status.textContent = 'Shuffled — tap Export PNG when you like it.';
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  drawCover(off, state, photos.map((p) => p.img));
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-frame-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved vice-frame-${w}x${h}.png`;
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, async (sample, text, sub) => {
    const img = await loadImage(sample);
    photos.push({ url: sample, name: sample, img });
    if (text) { caption.value = text; state.title = text; }
    if (sub) { subtitle.value = sub; state.subtitle = sub; }
    redraw();
  }, redraw);
} else {
  // Load the two free sample photos, then draw the first cover.
  Promise.all([
    loadImage('samples/pier.jpg').then((img) => photos.push({ url: 'samples/pier.jpg', name: 'Pier (sample)', img })),
    loadImage('samples/boulevard.jpg').then((img) => photos.push({ url: 'samples/boulevard.jpg', name: 'Boulevard (sample)', img })),
  ]).then(() => {
    renderThumbs();
    renderPanelButtons();
    redraw();
  }).catch(() => redraw());
  renderPanelButtons();
  redraw();
}
