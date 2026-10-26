/* ============================================================
   表情工坊 · GIF Studio — 应用逻辑
   ============================================================ */
(() => {
  'use strict';

  /* ---------- gifenc（通过 index.html 注入的全局 exports） ---------- */
  const _exp = window.exports || {};
  const GIFEncoder = _exp.GIFEncoder;
  const quantize = _exp.quantize;
  const applyPalette = _exp.applyPalette;

  /* ---------- 常量 ---------- */
  const SIZE_PRESETS = [
    { id: 's25',    label: '25×25',   w: 25,  h: 25 },
    { id: 's32',    label: '32×32',   w: 32,  h: 32 },
    { id: 's40',    label: '40×40',   w: 40,  h: 40 },
    { id: 's50',    label: '50×50',   w: 50,  h: 50 },
    { id: 's64',    label: '64×64',   w: 64,  h: 64 },
    { id: 's80',    label: '80×80',   w: 80,  h: 80 },
    { id: 's100',   label: '100×100', w: 100, h: 100 },
    { id: 's128',   label: '128×128', w: 128, h: 128 },
    { id: 'wechat',    label: '微信 240', w: 240, h: 240 },
    { id: 'sticker',   label: '大表情 320', w: 320, h: 320 },
    { id: 'square',    label: '方形 480', w: 480, h: 480 },
    { id: 'landscape', label: '横版 640×360', w: 640, h: 360 },
    { id: 'wide',      label: '宽屏 800×450', w: 800, h: 450 },
    { id: 'custom',    label: '自定义',   w: null, h: null },
  ];
  const COLOR_OPTIONS = [32, 64, 128, 256];
  const LOOP_OPTIONS = [
    { v: 0, label: '无限' },
    { v: 1, label: '1 次' },
    { v: 3, label: '3 次' },
    { v: 5, label: '5 次' },
  ];
  const FORMAT_OPTIONS = [
    { v: 'png',  label: 'PNG' },
    { v: 'jpeg', label: 'JPEG' },
    { v: 'webp', label: 'WebP' },
  ];
  const FILTER_OPTIONS = [
    { v: 'none',      label: '无' },
    { v: 'sharpen',   label: '锐化' },
    { v: 'blur',      label: '变糊' },
    { v: 'aged',      label: '包浆' },
    { v: 'sepia',     label: '复古' },
    { v: 'grayscale', label: '黑白' },
    { v: 'saturate',  label: '高饱和' },
  ];
  const MAX_FRAMES = 240;
  const MEME_FONT = '"Impact","Arial Black","Helvetica Neue",sans-serif';

  /* ---------- 状态 ---------- */
  const state = {
    mode: 'video',
    w: 480, h: 480,
    sizePreset: 'square',
    fit: 'cover',
    fps: 10,
    colors: 128,
    trimStart: 0, trimEnd: 0,
    speed: 1,
    loop: 0,
    reverse: false,
    format: 'png',
    quality: 0.9,
    filter: 'none',
    filterStrength: 60,
    textTop: '', textBottom: '',
    textSize: 32, textStroke: 3,
    textColor: '#ffffff', textStrokeColor: '#000000',
    uppercase: true,
    hasVideo: false, hasImage: false,
    imageList: [],
    image: null,
    result: null,
    history: [],
    customPresets: [],
    encoding: false,
    cancelRequested: false,
    previewStopped: true,
    _imgTimer: null,
  };

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    root: document.documentElement,
    themeToggle: $('themeToggle'),
    modeSegs: [...document.querySelectorAll('.mode-switch .seg')],
    fitSegs: [...document.querySelectorAll('.segmented [data-fit]')],
    pickFile: $('pickFile'),
    fileInput: $('fileInput'),
    dzSub: $('dzSub'),
    stage: $('stage'),
    preview: $('preview'),
    video: $('video'),
    dropzone: $('dropzone'),
    dragOverlay: $('dragOverlay'),
    progressOverlay: $('progressOverlay'),
    ringFill: $('ringFill'),
    progressLabel: $('progressLabel'),
    progressSub: $('progressSub'),
    cancelBtn: $('cancelBtn'),
    videoControls: $('videoControls'),
    playBtn: $('playBtn'),
    timeLabel: $('timeLabel'),
    outputBar: $('outputBar'),
    outputThumb: $('outputThumb'),
    outputTitle: $('outputTitle'),
    outputStats: $('outputStats'),
    outputDone: $('outputDone'),
    copyBtn: $('copyBtn'),
    downloadBtn: $('downloadBtn'),
    history: $('history'),
    sizeChips: $('sizeChips'),
    sizeBadge: $('sizeBadge'),
    dimRow: $('dimRow'),
    dimW: $('dimW'),
    dimH: $('dimH'),
    swapDims: $('swapDims'),
    presetSaveRow: $('presetSaveRow'),
    presetName: $('presetName'),
    presetSaveConfirm: $('presetSaveConfirm'),
    presetSaveCancel: $('presetSaveCancel'),
    fps: $('fps'), fpsVal: $('fpsVal'),
    colorChips: $('colorChips'), colorsVal: $('colorsVal'),
    trimTrack: $('trimTrack'), trimFill: $('trimFill'),
    trimStart: $('trimStart'), trimEnd: $('trimEnd'),
    trimStartHint: $('trimStartHint'), trimEndHint: $('trimEndHint'), trimVal: $('trimVal'),
    speed: $('speed'), speedVal: $('speedVal'),
    loopChips: $('loopChips'),
    reverse: $('reverse'),
    textTop: $('textTop'), textBottom: $('textBottom'),
    textSize: $('textSize'), textSizeVal: $('textSizeVal'),
    textStroke: $('textStroke'), textStrokeVal: $('textStrokeVal'),
    textColor: $('textColor'), textStrokeColor: $('textStrokeColor'),
    uppercase: $('uppercase'),
    formatChips: $('formatChips'),
    qualityField: $('qualityField'), quality: $('quality'), qualityVal: $('qualityVal'),
    filterChips: $('filterChips'),
    filterStrengthField: $('filterStrengthField'),
    filterStrength: $('filterStrength'), filterStrengthVal: $('filterStrengthVal'),
    generateBtn: $('generateBtn'),
    genLabel: document.querySelector('.gen-label'),
    footNote: $('footNote'),
    toast: $('toast'),
  };

  const previewCtx = el.preview.getContext('2d');
  const workCanvas = document.createElement('canvas');
  const workCtx = workCanvas.getContext('2d', { willReadFrequently: true });
  const scratchCanvas = document.createElement('canvas');
  const scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });

  /* ---------- 工具 ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmtBytes = (n) => {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  };
  const fmtSec = (s) => (Math.round(s * 10) / 10).toFixed(1) + 's';
  const fmtClock = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + String(r).padStart(2, '0');
  };
  const renameExt = (name, fmt) => name.replace(/\.[^.]+$/, '') + '.' + (fmt === 'jpeg' ? 'jpg' : fmt);
  const waitEvent = (t, name, timeout = 10000) => new Promise((res, rej) => {
    const on = () => { cleanup(); res(); };
    const fail = () => { cleanup(); rej(new Error(name + ' 超时')); };
    const to = setTimeout(fail, timeout);
    function cleanup() { clearTimeout(to); t.removeEventListener(name, on); }
    t.addEventListener(name, on);
  });
  const yieldUI = () => new Promise((res) => {
    const t = setTimeout(res, 120);
    requestAnimationFrame(() => { clearTimeout(t); res(); });
  });
  const nextTick = () => new Promise((r) => setTimeout(r, 0));

  function toast(msg, isError) {
    el.toast.textContent = '';
    const dot = document.createElement('span');
    dot.className = 't-dot';
    el.toast.appendChild(dot);
    el.toast.appendChild(document.createTextNode(msg));
    el.toast.classList.toggle('error', !!isError);
    el.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.toast.classList.remove('show'), 2400);
  }

  /* ---------- 主题 ---------- */
  function initTheme() {
    const saved = localStorage.getItem('gifstudio-theme');
    if (saved) el.root.dataset.theme = saved;
  }
  el.themeToggle.addEventListener('click', () => {
    const next = el.root.dataset.theme === 'dark' ? 'light' : 'dark';
    el.root.dataset.theme = next;
    localStorage.setItem('gifstudio-theme', next);
  });

  /* ---------- 分段控件（模式 / 适配） ---------- */
  el.modeSegs.forEach((seg) => seg.addEventListener('click', () => switchMode(seg.dataset.mode)));
  el.fitSegs.forEach((seg) => seg.addEventListener('click', () => {
    el.fitSegs.forEach((s) => s.classList.toggle('is-active', s === seg));
    state.fit = seg.dataset.fit;
    onParamsChanged();
  }));

  function switchMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    el.modeSegs.forEach((s) => {
      const active = s.dataset.mode === mode;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-selected', active);
    });
    applyModeScope();
    stopPreviewLoop();
    el.video.pause();
    el.videoControls.hidden = true;
    const hasSource = (mode === 'video' && state.hasVideo) || (mode === 'image' && state.hasImage);
    el.dropzone.style.display = hasSource ? 'none' : '';
    el.preview.classList.toggle('show', hasSource);
    updateDropzone();
    updateGenerateLabel();
    el.footNote.textContent = mode === 'video'
      ? '帧率越低、颜色越少，文件越小 · 微信表情建议 ≤ 1MB'
      : '支持 PNG / JPEG / WebP · 可一次拖入多张批量压缩';
    if (mode === 'video' && state.hasVideo) { showStageMedia(); startPreviewLoop(); }
    else if (mode === 'image' && state.hasImage) { renderStaticPreview(); }
    scheduleSave();
  }

  function applyModeScope() {
    document.querySelectorAll('.control-group[data-scope]').forEach((g) => {
      const scope = g.dataset.scope;
      g.classList.toggle('hidden-scope', scope !== 'both' && scope !== state.mode);
    });
  }

  function updateDropzone() {
    el.dzSub.textContent = state.mode === 'video'
      ? '视频自动转成 GIF · 图片自动压缩'
      : '图片自动缩放 · 可批量拖入多张';
  }

  function updateGenerateLabel() {
    el.genLabel.textContent = state.mode === 'video' ? '生成 GIF' : '生成图片';
  }

  /* ---------- 尺寸 ---------- */
  function renderSizeChips() {
    el.sizeChips.innerHTML = '';
    const builtins = SIZE_PRESETS.map((p) => ({ ...p }));
    const customs = state.customPresets.map((p) => ({ ...p, custom: true }));
    const all = builtins.concat(customs);
    all.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'chip' + (p.id === state.sizePreset ? ' is-active' : '') + (p.custom ? ' chip-custom' : '');
      b.title = p.custom ? (p.label + '（' + p.w + '×' + p.h + '）') : (p.w ? (p.label + ' · ' + p.w + '×' + p.h) : p.label);
      if (p.custom) {
        const name = document.createElement('span');
        name.textContent = p.label;
        b.appendChild(name);
        const x = document.createElement('span');
        x.className = 'chip-x';
        x.textContent = '×';
        x.title = '删除此预设';
        x.addEventListener('click', (e) => { e.stopPropagation(); deletePreset(p.id); });
        b.appendChild(x);
      } else {
        b.textContent = p.label;
      }
      b.addEventListener('click', () => selectSizePreset(p));
      el.sizeChips.appendChild(b);
    });
    // 末尾「保存尺寸」按钮
    const add = document.createElement('button');
    add.className = 'chip chip-add' + (presetEditorOpen ? ' is-active' : '');
    add.textContent = '＋ 保存尺寸';
    add.title = '把当前尺寸保存为自定义预设';
    add.addEventListener('click', openPresetEditor);
    el.sizeChips.appendChild(add);
  }

  function selectSizePreset(p) {
    state.sizePreset = p.id;
    if (p.fit) {
      state.fit = p.fit;
      el.fitSegs.forEach((s) => s.classList.toggle('is-active', s.dataset.fit === p.fit));
    }
    renderSizeChips();
    el.dimRow.hidden = p.id !== 'custom';
    if (p.id !== 'custom') {
      state.w = p.w; state.h = p.h;
    } else {
      state.w = +el.dimW.value || 480;
      state.h = +el.dimH.value || 480;
    }
    syncDimInputs();
    onParamsChanged();
  }

  function syncDimInputs() {
    el.dimW.value = state.w;
    el.dimH.value = state.h;
    el.sizeBadge.textContent = state.w + ' × ' + state.h;
  }

  /* ---------- 自定义预设 ---------- */
  let presetEditorOpen = false;
  function openPresetEditor() {
    presetEditorOpen = !presetEditorOpen;
    el.presetSaveRow.hidden = !presetEditorOpen;
    if (presetEditorOpen) {
      el.presetName.value = state.w + '×' + state.h;
      el.presetName.focus();
      el.presetName.select();
    }
    renderSizeChips();
  }
  function closePresetEditor() {
    presetEditorOpen = false;
    el.presetSaveRow.hidden = true;
    renderSizeChips();
  }
  function confirmPreset() {
    const label = el.presetName.value.trim() || (state.w + '×' + state.h);
    state.customPresets = state.customPresets.filter((p) => p.label !== label);
    state.customPresets.push({ id: 'u' + Date.now(), label, w: state.w, h: state.h, fit: state.fit });
    saveCustomPresets();
    state.sizePreset = state.customPresets[state.customPresets.length - 1].id;
    closePresetEditor();
    renderSizeChips();
    scheduleSave();
    toast('已保存预设「' + label + '」');
  }
  function deletePreset(id) {
    state.customPresets = state.customPresets.filter((p) => p.id !== id);
    if (state.sizePreset === id) {
      const sq = SIZE_PRESETS.find((p) => p.id === 'square');
      state.sizePreset = 'square';
      state.w = sq.w; state.h = sq.h;
    }
    saveCustomPresets();
    renderSizeChips();
    syncDimInputs();
    onParamsChanged();
    toast('已删除预设');
  }
  function loadCustomPresets() {
    try {
      const arr = JSON.parse(localStorage.getItem('gifstudio-presets') || 'null');
      if (Array.isArray(arr)) {
        state.customPresets = arr.filter((p) => p && p.id && p.label && p.w > 0 && p.h > 0);
      }
    } catch (e) {}
  }
  function saveCustomPresets() {
    try { localStorage.setItem('gifstudio-presets', JSON.stringify(state.customPresets)); } catch (e) {}
  }

  el.dimW.addEventListener('input', () => { state.w = clamp(+el.dimW.value || 8, 8, 2000); onParamsChanged(); });
  el.dimH.addEventListener('input', () => { state.h = clamp(+el.dimH.value || 8, 8, 2000); onParamsChanged(); });
  el.swapDims.addEventListener('click', () => {
    const t = state.w; state.w = state.h; state.h = t;
    syncDimInputs(); onParamsChanged();
  });
  el.presetSaveConfirm.addEventListener('click', confirmPreset);
  el.presetSaveCancel.addEventListener('click', closePresetEditor);
  el.presetName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmPreset(); }
    else if (e.key === 'Escape') { e.preventDefault(); closePresetEditor(); }
  });

  /* ---------- chips：颜色 / 循环 / 格式 ---------- */
  function renderChips(container, options, active, onPick, valueKey) {
    container.innerHTML = '';
    options.forEach((o) => {
      const v = valueKey ? o[valueKey] : o;
      const label = valueKey ? o.label : o;
      const b = document.createElement('button');
      b.className = 'chip' + (v === active ? ' is-active' : '');
      b.textContent = label;
      b.addEventListener('click', () => { onPick(v); });
      container.appendChild(b);
    });
  }

  function renderColorChips() {
    renderChips(el.colorChips, COLOR_OPTIONS, state.colors, (v) => {
      state.colors = v;
      el.colorsVal.textContent = v;
      renderColorChips();
      onParamsChanged();
    });
  }
  function renderLoopChips() {
    renderChips(el.loopChips, LOOP_OPTIONS, state.loop, (v) => {
      state.loop = v;
      renderLoopChips();
      onParamsChanged();
    }, 'v');
  }
  function renderFormatChips() {
    renderChips(el.formatChips, FORMAT_OPTIONS, state.format, (v) => {
      state.format = v;
      el.qualityField.hidden = v === 'png';
      renderFormatChips();
      onParamsChanged();
    }, 'v');
  }
  function renderFilterChips() {
    renderChips(el.filterChips, FILTER_OPTIONS, state.filter, (v) => {
      state.filter = v;
      el.filterStrengthField.hidden = v === 'none';
      renderFilterChips();
      onParamsChanged();
    }, 'v');
  }

  /* ---------- 滑块 ---------- */
  function bindSlider(input, onInput) {
    const update = () => {
      const min = +input.min, max = +input.max, v = +input.value;
      input.style.setProperty('--p', (((v - min) / (max - min)) * 100) + '%');
    };
    input.addEventListener('input', () => { update(); onInput(+input.value); });
    update();
  }

  bindSlider(el.fps, (v) => { state.fps = v; el.fpsVal.textContent = v + ' fps'; onParamsChanged(); });
  bindSlider(el.speed, (v) => { state.speed = v; el.speedVal.textContent = formatSpeed(v); onParamsChanged(); });
  bindSlider(el.textSize, (v) => { state.textSize = v; el.textSizeVal.textContent = v; onParamsChanged(); });
  bindSlider(el.textStroke, (v) => { state.textStroke = v; el.textStrokeVal.textContent = v; onParamsChanged(); });
  bindSlider(el.quality, (v) => {
    state.quality = v;
    el.qualityVal.textContent = Math.round(v * 100) + '%';
    onParamsChanged();
  });
  bindSlider(el.filterStrength, (v) => {
    state.filterStrength = v;
    el.filterStrengthVal.textContent = v + '%';
    onParamsChanged();
  });
  function formatSpeed(v) {
    if (v === 1) return '1×';
    if (v < 1) return '0.' + Math.round(v * 100) + '×';
    return v.toFixed(v % 1 === 0 ? 0 : 1) + '×';
  }

  /* ---------- 裁剪 ---------- */
  function updateTrimUI() {
    const dur = videoDuration();
    const max = dur > 0 ? dur : 1;
    el.trimStart.max = max; el.trimEnd.max = max;
    el.trimStart.value = clamp(state.trimStart, 0, max);
    el.trimEnd.value = clamp(state.trimEnd, 0, max);
    const s = state.trimStart, e = state.trimEnd;
    const sp = (s / max) * 100, ep = (e / max) * 100;
    el.trimFill.style.left = sp + '%';
    el.trimFill.style.width = Math.max(0, ep - sp) + '%';
    el.trimStartHint.textContent = fmtSec(s);
    el.trimEndHint.textContent = fmtSec(e);
    const full = s <= 0.001 && e >= max - 0.001;
    el.trimVal.textContent = full ? '全部' : fmtSec(s) + ' – ' + fmtSec(e);
  }
  el.trimStart.addEventListener('input', () => {
    state.trimStart = Math.min(+el.trimStart.value, state.trimEnd - 0.05);
    updateTrimUI(); onParamsChanged();
  });
  el.trimEnd.addEventListener('input', () => {
    state.trimEnd = Math.max(+el.trimEnd.value, state.trimStart + 0.05);
    updateTrimUI(); onParamsChanged();
  });

  /* ---------- 文字 / 开关 ---------- */
  el.textTop.addEventListener('input', () => { state.textTop = el.textTop.value; onParamsChanged(); });
  el.textBottom.addEventListener('input', () => { state.textBottom = el.textBottom.value; onParamsChanged(); });
  el.textColor.addEventListener('input', () => { state.textColor = el.textColor.value; onParamsChanged(); });
  el.textStrokeColor.addEventListener('input', () => { state.textStrokeColor = el.textStrokeColor.value; onParamsChanged(); });
  el.uppercase.addEventListener('change', () => { state.uppercase = el.uppercase.checked; onParamsChanged(); });
  el.reverse.addEventListener('change', () => { state.reverse = el.reverse.checked; onParamsChanged(); });

  /* ---------- 参数变化 ---------- */
  function onParamsChanged() {
    syncDimInputs();
    if (state.mode === 'image' && state.hasImage) {
      renderStaticPreview();
      scheduleImageReprocess();
    } else if (state.mode === 'video' && state.hasVideo) {
      renderCurrentFrame();
    }
    scheduleSave();
  }

  /* ---------- 绘制：合成（适配 + 文字） ---------- */
  function srcSize(src) {
    return {
      w: src.videoWidth || src.naturalWidth || src.width || state.w,
      h: src.videoHeight || src.naturalHeight || src.height || state.h,
    };
  }

  function drawComposite(ctx, W, H, src, fit, bg) {
    ctx.clearRect(0, 0, W, H);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    if (!src) return;
    const { w: sw, h: sh } = srcSize(src);
    if (!sw || !sh) return;
    let dx = 0, dy = 0, dw = W, dh = H;
    const ar = sw / sh, tar = W / H;
    if (fit === 'cover') {
      if (ar > tar) { dh = H; dw = H * ar; } else { dw = W; dh = W / ar; }
      dx = (W - dw) / 2; dy = (H - dh) / 2;
    } else if (fit === 'contain') {
      if (ar > tar) { dw = W; dh = W / ar; } else { dh = H; dw = H * ar; }
      dx = (W - dw) / 2; dy = (H - dh) / 2;
    } // stretch: dw=W dh=H
    try { ctx.drawImage(src, dx, dy, dw, dh); } catch (e) {}
    drawMemeText(ctx, W, H);
  }

  function drawMemeText(ctx, W, H) {
    const top = state.textTop.trim(), bottom = state.textBottom.trim();
    if (!top && !bottom) return;
    const pad = Math.round(W * 0.045);
    const stroke = state.textStroke;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    if (typeof ctx.letterSpacing !== 'undefined') ctx.letterSpacing = '0.5px';
    const drawLine = (raw, y) => {
      let text = raw;
      if (state.uppercase && /[a-zA-Z]/.test(text)) text = text.toUpperCase();
      let size = state.textSize;
      ctx.font = '900 ' + size + 'px ' + MEME_FONT;
      while (size > 6 && ctx.measureText(text).width > W - pad * 2) {
        size = Math.round(size * 0.94);
        ctx.font = '900 ' + size + 'px ' + MEME_FONT;
      }
      ctx.lineWidth = stroke;
      ctx.strokeStyle = state.textStrokeColor;
      ctx.fillStyle = state.textColor;
      if (stroke > 0) ctx.strokeText(text, W / 2, y);
      ctx.fillText(text, W / 2, y);
    };
    if (top) drawLine(top, pad + state.textSize * 0.55);
    if (bottom) drawLine(bottom, H - pad - state.textSize * 0.55);
  }

  /* ---------- 滤镜引擎 ---------- */
  const clampByte = (v) => (v < 0 ? 0 : (v > 255 ? 255 : Math.round(v)));

  function boxBlur(data, W, H, r) {
    if (r < 1) return;
    const tmp = new Uint8ClampedArray(data.length);
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const i = (row + xx) * 4;
          sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; sa += data[i + 3]; n++;
        }
        const o = (row + x) * 4;
        tmp[o] = sr / n; tmp[o + 1] = sg / n; tmp[o + 2] = sb / n; tmp[o + 3] = sa / n;
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sr = 0, sg = 0, sb = 0, sa = 0, n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          const i = (yy * W + x) * 4;
          sr += tmp[i]; sg += tmp[i + 1]; sb += tmp[i + 2]; sa += tmp[i + 3]; n++;
        }
        const o = (y * W + x) * 4;
        data[o] = sr / n; data[o + 1] = sg / n; data[o + 2] = sb / n; data[o + 3] = sa / n;
      }
    }
  }

  function filterPixels(data, W, H, filter, t) {
    switch (filter) {
      case 'blur':
        boxBlur(data, W, H, Math.round(0.5 + t * 3.5));
        break;
      case 'sharpen': {
        const blurred = new Uint8ClampedArray(data);
        boxBlur(blurred, W, H, 1);
        const amount = 0.3 + t * 1.3;
        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            data[i + c] = clampByte(data[i + c] + amount * (data[i + c] - blurred[i + c]));
          }
        }
        break;
      }
      case 'aged': {
        boxBlur(data, W, H, 1);
        const levels = Math.max(8, Math.round(48 - 40 * t));
        const step = 256 / levels;
        const desat = 0.5 * t, green = 10 * t, fade = 24 * t, contrast = 1 - 0.4 * t, noise = 16 * t;
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i], g = data[i + 1], b = data[i + 2];
          r = Math.round(r / step) * step;
          g = Math.round(g / step) * step;
          b = Math.round(b / step) * step;
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          r = r + (l - r) * desat + green * 0.35;
          g = g + (l - g) * desat + green;
          b = b + (l - b) * desat - green * 0.25;
          r = (r - 128) * contrast + 128 + fade;
          g = (g - 128) * contrast + 128 + fade;
          b = (b - 128) * contrast + 128 + fade * 0.5;
          const n = (Math.random() * 2 - 1) * noise;
          data[i] = clampByte(r + n);
          data[i + 1] = clampByte(g + n);
          data[i + 2] = clampByte(b + n);
        }
        break;
      }
      case 'grayscale':
        for (let i = 0; i < data.length; i += 4) {
          const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] += (l - data[i]) * t;
          data[i + 1] += (l - data[i + 1]) * t;
          data[i + 2] += (l - data[i + 2]) * t;
        }
        break;
      case 'sepia':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          data[i] = r + (sr - r) * t;
          data[i + 1] = g + (sg - g) * t;
          data[i + 2] = b + (sb - b) * t;
        }
        break;
      case 'saturate':
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          const s = 1 + t * 1.2;
          data[i] = clampByte(l + (r - l) * s);
          data[i + 1] = clampByte(l + (g - l) * s);
          data[i + 2] = clampByte(l + (b - l) * s);
        }
        break;
    }
  }

  function cssFilterFor() {
    if (state.filter === 'none') return 'none';
    const t = state.filterStrength / 100;
    switch (state.filter) {
      case 'blur': return 'blur(' + (0.5 + t * 4).toFixed(2) + 'px)';
      case 'grayscale': return 'grayscale(' + t.toFixed(2) + ')';
      case 'sepia': return 'sepia(' + t.toFixed(2) + ')';
      case 'saturate': return 'saturate(' + (1 + t * 1.2).toFixed(2) + ')';
      case 'sharpen': return 'contrast(' + (1 + t * 0.25).toFixed(2) + ') saturate(' + (1 + t * 0.2).toFixed(2) + ')';
      case 'aged': return 'saturate(' + (1 - t * 0.55).toFixed(2) + ') contrast(' + (1 - t * 0.42).toFixed(2) + ') brightness(' + (1 + t * 0.05).toFixed(2) + ') sepia(' + (t * 0.3).toFixed(2) + ')';
    }
    return 'none';
  }

  // 精确滤镜（编码 / 输出用），作用于离屏画布
  function applyFilterExact(ctx, W, H) {
    if (state.filter === 'none') return;
    const t = state.filterStrength / 100;
    if (state.filter === 'aged') {
      const sw = Math.max(2, Math.round(W / 4)), sh = Math.max(2, Math.round(H / 4));
      scratchCanvas.width = sw; scratchCanvas.height = sh;
      scratchCtx.clearRect(0, 0, sw, sh);
      scratchCtx.drawImage(ctx.canvas, 0, 0, W, H, 0, 0, sw, sh);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(scratchCanvas, 0, 0, sw, sh, 0, 0, W, H);
    }
    const img = ctx.getImageData(0, 0, W, H);
    filterPixels(img.data, W, H, state.filter, t);
    ctx.putImageData(img, 0, 0);
  }

  // 预览用（GPU 加速，近似；锐化 / 包浆以输出为准）
  function drawPreviewFiltered(ctx, W, H, src, fit, bg) {
    ctx.filter = cssFilterFor();
    drawComposite(ctx, W, H, src, fit, bg);
    ctx.filter = 'none';
  }

  /* ---------- 预览舞台布局 / 渲染 ---------- */
  function layoutPreview() {
    const pad = 28;
    const availW = el.stage.clientWidth - pad * 2;
    const availH = el.stage.clientHeight - pad * 2;
    if (availW <= 0 || availH <= 0) return;
    const scale = Math.min(availW / state.w, availH / state.h, 2.5);
    el.preview.style.width = Math.max(1, Math.round(state.w * scale)) + 'px';
    el.preview.style.height = Math.max(1, Math.round(state.h * scale)) + 'px';
  }
  function ensurePreviewSize() {
    if (el.preview.width !== state.w || el.preview.height !== state.h) {
      el.preview.width = state.w;
      el.preview.height = state.h;
    }
    layoutPreview();
  }

  function renderCurrentFrame() {
    ensurePreviewSize();
    if (state.mode === 'video' && el.video.readyState >= 2) {
      drawPreviewFiltered(previewCtx, state.w, state.h, el.video, state.fit);
    }
    el.preview.classList.add('show');
    el.dropzone.style.display = 'none';
  }

  function renderStaticPreview() {
    ensurePreviewSize();
    const src = state.image && state.image.bmp;
    if (src) drawPreviewFiltered(previewCtx, state.w, state.h, src, state.fit, state.format === 'jpeg' ? '#ffffff' : null);
    el.preview.classList.add('show');
    el.dropzone.style.display = 'none';
  }

  /* ---------- 预览循环（视频播放） ---------- */
  let rafId = null;
  function startPreviewLoop() {
    if (state.mode !== 'video' || !state.hasVideo) return;
    if (!state.previewStopped) return; // 已在运行
    state.previewStopped = false;
    const loop = () => {
      if (state.previewStopped) return;
      const v = el.video;
      if (v.readyState >= 2 && !v.paused && !v.seeking) {
        if (state.trimEnd > 0 && v.currentTime > state.trimEnd) v.currentTime = state.trimStart;
        drawPreviewFiltered(previewCtx, state.w, state.h, v, state.fit);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }
  function stopPreviewLoop() {
    state.previewStopped = true;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  /* ---------- 视频时长 ---------- */
  function videoDuration() {
    const d = el.video.duration;
    return Number.isFinite(d) ? d : 0;
  }

  /* ---------- 文件导入 ---------- */
  const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v|ogv|mpeg|mpg)$/i;
  const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;
  function detectKind(file) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'image';
    if (VIDEO_EXT.test(file.name)) return 'video';
    if (IMAGE_EXT.test(file.name)) return 'image';
    return null;
  }

  el.pickFile.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => {
    if (el.fileInput.files.length) handleFiles([...el.fileInput.files]);
    el.fileInput.value = '';
  });

  function handleFiles(files) {
    const vids = files.filter((f) => detectKind(f) === 'video');
    const imgs = files.filter((f) => detectKind(f) === 'image');
    if (vids.length) { switchMode('video'); loadVideoFile(vids[0]); }
    else if (imgs.length) { switchMode('image'); loadImageFiles(imgs); }
    else toast('不支持的文件类型', true);
  }

  /* ---------- 拖拽 ---------- */
  let dragDepth = 0;
  window.addEventListener('dragover', (e) => { e.preventDefault(); });
  window.addEventListener('drop', (e) => { e.preventDefault(); });

  el.stage.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragDepth++;
    el.dragOverlay.classList.add('active');
  });
  el.stage.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) el.dragOverlay.classList.remove('active');
  });
  el.stage.addEventListener('dragover', (e) => e.preventDefault());
  el.stage.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    el.dragOverlay.classList.remove('active');
    if (e.dataTransfer && e.dataTransfer.files.length) {
      handleFiles([...e.dataTransfer.files]);
    }
  });

  /* ---------- 视频处理 ---------- */
  async function loadVideoFile(file) {
    state.cancelRequested = false;
    if (state.encoding) {
      state.cancelRequested = true;
      const t0 = Date.now();
      while (state.encoding && Date.now() - t0 < 3000) await nextTick();
    }
    const url = URL.createObjectURL(file);
    const v = el.video;
    v.muted = true;
    v.setAttribute('muted', '');
    v.src = url;
    try {
      await waitEvent(v, 'loadedmetadata', 15000);
      await waitEvent(v, 'loadeddata', 15000);
    } catch (err) {
      toast('无法解码该视频：' + err.message, true);
      return;
    }
    const dur = videoDuration();
    state.trimEnd = dur > 0 ? dur : 5;
    state.trimStart = 0;
    state.hasVideo = true;
    state.hasImage = false;
    state._videoName = file.name;
    updateTrimUI();
    showStageMedia();
    v.play().catch(() => {});
    startPreviewLoop();
    toast('已导入 · 正在自动转 GIF');
    encodeVideo(file.name);
  }

  function showStageMedia() {
    el.dropzone.style.display = 'none';
    el.videoControls.hidden = false;
    ensurePreviewSize();
    el.preview.classList.add('show');
  }

  function seekVideo(time) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        el.video.removeEventListener('seeked', finish);
        clearTimeout(to);
        resolve();
      };
      const to = setTimeout(finish, 4000);
      el.video.addEventListener('seeked', finish);
      try { el.video.currentTime = time; } catch (e) { finish(); return; }
      if (Math.abs(el.video.currentTime - time) < 0.015) finish();
    });
  }

  function transparentIndex(palette) {
    for (let i = 0; i < palette.length; i++) {
      const c = palette[i];
      if (c && c.length >= 4 && c[3] === 0) return i;
    }
    return -1;
  }

  async function encodeVideo(name) {
    if (state.encoding) return;
    if (!state.hasVideo) return;
    if (!GIFEncoder || !quantize || !applyPalette) {
      toast('GIF 编码器加载失败', true);
      return;
    }
    const W = state.w, H = state.h;
    const start = state.trimStart, end = state.trimEnd;
    const dur = Math.max(0.05, end - start);
    const fps = state.fps, speed = state.speed, loop = state.loop, reverse = state.reverse;
    const isContain = state.fit === 'contain';

    let n = Math.round(dur * fps);
    if (n < 1) n = 1;
    let step = 1 / fps;
    if (n > MAX_FRAMES) { n = MAX_FRAMES; step = dur / n; }
    const times = [];
    for (let i = 0; i < n; i++) times.push(start + i * step + step / 2);
    if (reverse) times.reverse();

    state.encoding = true;
    state.cancelRequested = false;
    setBusy(true);
    showProgress(true);
    el.video.pause();
    stopPreviewLoop();

    const gif = GIFEncoder();
    const delay = Math.max(20, Math.round(1000 / (fps * speed)));
    const format = isContain ? 'rgba4444' : 'rgb565';

    try {
      workCanvas.width = W; workCanvas.height = H;
      let first = true;
      for (let i = 0; i < times.length; i++) {
        if (state.cancelRequested) break;
        await seekVideo(clamp(times[i], 0, Math.max(0, videoDuration() - 0.001)));
        drawComposite(workCtx, W, H, el.video, state.fit);
        applyFilterExact(workCtx, W, H);
        const img = workCtx.getImageData(0, 0, W, H);
        const palette = quantize(img.data, state.colors, { format, oneBitAlpha: isContain });
        const index = applyPalette(img.data, palette, format);
        const tIdx = isContain ? transparentIndex(palette) : -1;
        gif.writeFrame(index, W, H, {
          palette,
          delay,
          repeat: first ? loop : 0,
          transparent: tIdx >= 0,
          transparentIndex: Math.max(tIdx, 0),
          dispose: 2,
        });
        first = false;
        updateProgress(i + 1, times.length);
        await yieldUI();
      }
      if (state.cancelRequested) {
        toast('已取消');
        return;
      }
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: 'image/gif' });
      showResult(blob, renameExt(name, 'gif'), 'gif', {
        width: W, height: H, frames: times.length, duration: dur,
      });
      toast('GIF 生成完成 🎉');
    } catch (err) {
      console.error(err);
      toast('转码失败：' + err.message, true);
    } finally {
      state.encoding = false;
      state.cancelRequested = false;
      setBusy(false);
      showProgress(false);
      if (state.mode === 'video') { el.video.play().catch(() => {}); startPreviewLoop(); }
    }
  }

  /* ---------- 图片处理 ---------- */
  function loadBitmap(file) {
    if ('createImageBitmap' in window) {
      return createImageBitmap(file).catch(() => loadImageElement(file));
    }
    return loadImageElement(file);
  }
  function loadImageElement(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('图片解码失败'));
      img.src = url;
    });
  }

  async function loadImageFiles(files) {
    const entries = [];
    for (const f of files) {
      try { entries.push({ bmp: await loadBitmap(f), name: f.name }); }
      catch (e) { toast('无法读取：' + f.name, true); }
    }
    if (!entries.length) return;
    state.hasImage = true;
    state.hasVideo = false;
    state.imageList = entries;
    state.image = entries[0];
    el.videoControls.hidden = true;
    stopPreviewLoop();
    renderStaticPreview();

    const results = [];
    for (const entry of entries) {
      const res = await processImage(entry);
      if (res) results.push(res);
    }
    if (!results.length) return;
    showResult(results[0].blob, results[0].name, results[0].type, { width: state.w, height: state.h });
    for (let i = 1; i < results.length; i++) {
      const r = results[i];
      addHistory(buildResult(r.blob, r.name, r.type, { width: state.w, height: state.h }));
    }
    toast(entries.length > 1 ? '已批量压缩 ' + entries.length + ' 张图片' : '图片已缩放');
  }

  async function processImage(entry) {
    const W = state.w, H = state.h, fmt = state.format, q = state.quality;
    workCanvas.width = W; workCanvas.height = H;
    drawComposite(workCtx, W, H, entry.bmp, state.fit, fmt === 'jpeg' ? '#ffffff' : null);
    applyFilterExact(workCtx, W, H);
    const mime = fmt === 'png' ? 'image/png' : fmt === 'jpeg' ? 'image/jpeg' : 'image/webp';
    try {
      const blob = await new Promise((res) => workCanvas.toBlob(res, mime, fmt === 'png' ? undefined : q));
      if (!blob) return null;
      return { blob, name: renameExt(entry.name, fmt), type: fmt, entry };
    } catch (e) {
      return null;
    }
  }

  function scheduleImageReprocess() {
    clearTimeout(state._imgTimer);
    state._imgTimer = setTimeout(async () => {
      if (state.mode !== 'image' || !state.hasImage || !state.image) return;
      const res = await processImage(state.image);
      if (res) showResult(res.blob, res.name, res.type, { width: state.w, height: state.h }, { pushHistory: false });
    }, 260);
  }

  /* ---------- 进度 / 忙碌 ---------- */
  const RING_C = 175.93;
  function showProgress(show) {
    el.progressOverlay.hidden = !show;
    if (show) updateProgress(0, 1);
  }
  function updateProgress(done, total) {
    const p = total ? done / total : 0;
    el.ringFill.style.strokeDashoffset = String(RING_C * (1 - p));
    el.progressLabel.textContent = '正在转码…';
    el.progressSub.textContent = done + ' / ' + total + ' 帧 · ' + Math.round(p * 100) + '%';
  }
  function setBusy(busy) {
    el.generateBtn.classList.toggle('busy', busy);
    el.generateBtn.disabled = busy;
  }
  el.cancelBtn.addEventListener('click', () => {
    if (state.encoding) state.cancelRequested = true;
  });
  el.generateBtn.addEventListener('click', () => {
    if (state.encoding) return;
    if (state.mode === 'video') {
      if (!state.hasVideo) { toast('请先拖入一段视频', true); return; }
      encodeVideo(state._videoName || 'output');
    } else {
      if (!state.hasImage) { toast('请先拖入一张图片', true); return; }
      (async () => {
        setBusy(true);
        const res = await processImage(state.image);
        if (res) showResult(res.blob, res.name, res.type, { width: state.w, height: state.h });
        setBusy(false);
      })();
    }
  });

  /* ---------- 结果 / 输出条 ---------- */
  function makeImg(url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    return img;
  }
  function resultStats(r) {
    const parts = [r.meta.width + '×' + r.meta.height, fmtBytes(r.blob.size)];
    if (r.type === 'gif' && r.meta.frames) {
      parts.push(r.meta.frames + ' 帧', fmtSec(r.meta.duration));
    }
    return parts.join(' · ');
  }
  function buildResult(blob, name, type, meta) {
    return { blob, url: URL.createObjectURL(blob), type, name, meta, ts: Date.now(), live: false };
  }
  function renderOutputBar() {
    const r = state.result;
    if (!r) return;
    el.outputThumb.innerHTML = '';
    el.outputThumb.appendChild(makeImg(r.url));
    el.outputTitle.textContent = r.name;
    el.outputStats.textContent = resultStats(r);
    el.outputBar.hidden = false;
  }
  function flashDone() {
    el.outputDone.style.animation = 'none';
    void el.outputDone.offsetWidth;
    el.outputDone.style.animation = '';
  }

  function showResult(blob, name, type, meta, opts = {}) {
    const flash = opts.flash !== false;
    const pushHistory = opts.pushHistory !== false;
    const result = buildResult(blob, name, type, meta);
    result.live = !pushHistory;
    if (state.result && state.result.live && state.result.url) {
      URL.revokeObjectURL(state.result.url);
    }
    state.result = result;
    renderOutputBar();
    if (flash) flashDone();
    if (pushHistory) {
      addHistory(result);
      highlightHistory(result);
    }
  }

  /* ---------- 历史 ---------- */
  function addHistory(result) {
    state.history = state.history.filter((h) => h !== result);
    state.history.unshift(result);
    while (state.history.length > 14) {
      const gone = state.history.pop();
      if (gone && gone !== state.result) URL.revokeObjectURL(gone.url);
    }
    renderHistory();
  }
  function highlightHistory(result) {
    [...el.history.children].forEach((c, i) => c.classList.toggle('active', state.history[i] === result));
  }
  function renderHistory() {
    el.history.innerHTML = '';
    el.history.hidden = state.history.length === 0;
    state.history.forEach((r) => {
      const item = document.createElement('div');
      item.className = 'hist-item';
      item.title = r.name;
      const img = makeImg(r.url);
      item.appendChild(img);
      const tag = document.createElement('span');
      tag.className = 'hist-tag';
      tag.textContent = r.type === 'gif' ? 'GIF' : r.type.toUpperCase();
      item.appendChild(tag);
      item.addEventListener('click', () => setActiveResult(r));
      el.history.appendChild(item);
    });
  }
  function setActiveResult(r) {
    state.result = r;
    renderOutputBar();
    highlightHistory(r);
    toast('已选中：' + r.name);
  }

  /* ---------- 下载 / 复制 ---------- */
  el.downloadBtn.addEventListener('click', () => {
    const r = state.result;
    if (!r) return;
    const a = document.createElement('a');
    a.href = r.url;
    a.download = r.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('已开始下载');
  });
  el.copyBtn.addEventListener('click', async () => {
    const r = state.result;
    if (!r) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ [r.blob.type]: r.blob })]);
      toast('已复制到剪贴板');
    } catch (e) {
      toast('当前浏览器不支持复制该格式，请使用下载', true);
    }
  });

  /* ---------- 播放控制 ---------- */
  el.playBtn.addEventListener('click', () => {
    const v = el.video;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  });
  el.video.addEventListener('play', () => { el.playBtn.classList.add('playing'); startPreviewLoop(); });
  el.video.addEventListener('pause', () => el.playBtn.classList.remove('playing'));
  el.video.addEventListener('ended', () => el.playBtn.classList.remove('playing'));
  el.video.addEventListener('timeupdate', () => {
    el.timeLabel.textContent = fmtClock(el.video.currentTime) + ' / ' + fmtClock(videoDuration());
  });

  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'Space' && state.mode === 'video' && state.hasVideo) {
      e.preventDefault();
      el.playBtn.click();
    }
  });

  /* ---------- 舞台尺寸 ---------- */
  let resizeObs = null;
  if ('ResizeObserver' in window) {
    resizeObs = new ResizeObserver(() => layoutPreview());
    resizeObs.observe(el.stage);
  } else {
    window.addEventListener('resize', layoutPreview);
  }

  /* ---------- 设置持久化 ---------- */
  function collectSettings() {
    return {
      mode: state.mode,
      w: state.w, h: state.h,
      sizePreset: state.sizePreset,
      fit: state.fit,
      fps: state.fps,
      colors: state.colors,
      speed: state.speed,
      loop: state.loop,
      reverse: state.reverse,
      format: state.format,
      quality: state.quality,
      filter: state.filter,
      filterStrength: state.filterStrength,
      textTop: state.textTop, textBottom: state.textBottom,
      textSize: state.textSize, textStroke: state.textStroke,
      textColor: state.textColor, textStrokeColor: state.textStrokeColor,
      uppercase: state.uppercase,
    };
  }
  let _saveTimer = null;
  function scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      try { localStorage.setItem('gifstudio-settings', JSON.stringify(collectSettings())); } catch (e) {}
    }, 300);
  }
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('gifstudio-settings') || 'null');
      if (s && typeof s === 'object') {
        Object.keys(s).forEach((k) => { if (k in state) state[k] = s[k]; });
      }
    } catch (e) {}
  }
  function refreshSlider(input) {
    const min = +input.min, max = +input.max, v = +input.value;
    input.style.setProperty('--p', (((v - min) / (max - min)) * 100) + '%');
  }
  function syncControls() {
    el.fps.value = state.fps; el.fpsVal.textContent = state.fps + ' fps'; refreshSlider(el.fps);
    el.colorsVal.textContent = state.colors;
    el.speed.value = state.speed; el.speedVal.textContent = formatSpeed(state.speed); refreshSlider(el.speed);
    el.textSize.value = state.textSize; el.textSizeVal.textContent = state.textSize; refreshSlider(el.textSize);
    el.textStroke.value = state.textStroke; el.textStrokeVal.textContent = state.textStroke; refreshSlider(el.textStroke);
    el.quality.value = state.quality; el.qualityVal.textContent = Math.round(state.quality * 100) + '%'; refreshSlider(el.quality);
    el.filterStrength.value = state.filterStrength; el.filterStrengthVal.textContent = state.filterStrength + '%'; refreshSlider(el.filterStrength);
    el.textTop.value = state.textTop;
    el.textBottom.value = state.textBottom;
    el.textColor.value = state.textColor;
    el.textStrokeColor.value = state.textStrokeColor;
    el.uppercase.checked = state.uppercase;
    el.reverse.checked = state.reverse;
    renderSizeChips();
    renderColorChips();
    renderLoopChips();
    renderFormatChips();
    renderFilterChips();
    syncDimInputs();
    updateTrimUI();
  }

  /* ---------- 初始化 ---------- */
  function init() {
    initTheme();
    loadCustomPresets();
    loadSettings();
    syncControls();
    el.modeSegs.forEach((s) => {
      const active = s.dataset.mode === state.mode;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-selected', active);
    });
    el.qualityField.hidden = state.format === 'png';
    el.filterStrengthField.hidden = state.filter === 'none';
    el.dimRow.hidden = state.sizePreset !== 'custom';
    applyModeScope();
    updateDropzone();
    updateGenerateLabel();
    el.footNote.textContent = '帧率越低、颜色越少，文件越小 · 微信表情建议 ≤ 1MB';
    el.preview.width = state.w;
    el.preview.height = state.h;
  }
  init();
})();
