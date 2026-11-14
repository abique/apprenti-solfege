// Prise de photo avec la webcam (ou choix d'une image) pour l'avatar.
import { h, modal } from './ui.js';
import { sfxPop } from './audio.js';

const SIZE = 256;

export function cameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;
}

function squareJPEG(source, sw, sh, mirror) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  const s = Math.min(sw, sh);
  if (mirror) {
    g.translate(SIZE, 0);
    g.scale(-1, 1);
  }
  g.drawImage(source, (sw - s) / 2, (sh - s) / 2, s, s, 0, 0, SIZE, SIZE);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** Ouvre la caméra frontale. Résout avec une image (data URL) ou null. */
export function takePhoto() {
  return new Promise((resolve) => {
    let stream = null;
    let data = null;
    let counting = false;
    const video = h('video', { autoplay: true, playsinline: true, muted: true });
    video.muted = true;
    video.setAttribute('playsinline', '');
    const img = h('img', { alt: 'Ta photo', hidden: true });
    const count = h('div', { class: 'cam-count' });
    const flash = h('div', { class: 'cam-flash' });
    const view = h('div', { class: 'cam-view' }, video, img, count, flash);
    const status = h('p', { class: 'muted' }, 'Mets ton visage dans le rond et fais un grand sourire ! 😄');
    const shoot = h('button', { class: 'btn big pink', type: 'button', disabled: true }, '📸 Clic !');
    const keep = h('button', { class: 'btn good', type: 'button', hidden: true }, 'Garder');
    const retry = h('button', { class: 'btn ghost', type: 'button', hidden: true }, 'Recommencer');
    const cancel = h('button', { class: 'btn ghost', type: 'button' }, 'Annuler');
    const box = h('div', { class: 'cam' }, view, status, h('div', { class: 'row', style: 'justify-content:center' }, shoot, keep, retry, cancel));

    const back = h('div', { class: 'modal-back' }, h('div', { class: 'modal' }, h('h2', { class: 'modal-title' }, 'Ta photo'), box));
    document.getElementById('overlay-root').append(back);

    function stop() {
      if (stream) for (const t of stream.getTracks()) t.stop();
      stream = null;
    }
    function done(v) {
      stop();
      back.classList.add('closing');
      setTimeout(() => back.remove(), 200);
      resolve(v);
    }
    async function countdown() {
      if (counting) return;
      counting = true;
      shoot.disabled = true;
      for (const n of ['3', '2', '1']) {
        count.textContent = n;
        sfxPop();
        await new Promise((r) => setTimeout(r, 700));
      }
      count.textContent = '';
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
      data = squareJPEG(video, video.videoWidth, video.videoHeight, true);
      img.src = data;
      img.hidden = false;
      video.hidden = true;
      shoot.hidden = true;
      keep.hidden = false;
      retry.hidden = false;
      counting = false;
    }
    function again() {
      data = null;
      img.hidden = true;
      video.hidden = false;
      shoot.hidden = false;
      shoot.disabled = false;
      keep.hidden = true;
      retry.hidden = true;
    }
    shoot.onclick = countdown;
    retry.onclick = again;
    keep.onclick = () => done(data);
    cancel.onclick = () => done(null);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        stream = s;
        video.srcObject = s;
        video.onloadedmetadata = () => { shoot.disabled = false; video.play().catch(() => {}); };
      })
      .catch((e) => {
        status.textContent = e?.name === 'NotAllowedError'
          ? 'La caméra a été refusée. Autorise-la dans les réglages du navigateur, ou choisis plutôt une image.'
          : 'Impossible d’ouvrir la caméra sur cet appareil.';
      });
  });
}

/** Choix d'une image dans la galerie (ou appareil photo sur tablette). */
export function pickImage() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'image/*' });
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        const data = squareJPEG(im, im.naturalWidth, im.naturalHeight, false);
        URL.revokeObjectURL(url);
        resolve(data);
      };
      im.onerror = () => {
        URL.revokeObjectURL(url);
        modal({ title: 'Oups', body: 'Cette image ne peut pas être ouverte.' });
        resolve(null);
      };
      im.src = url;
    };
    input.click();
  });
}
