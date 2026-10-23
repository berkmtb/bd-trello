// Firestore documents max out at ~1 MB, so images are shrunk in the browser first.
const MAX_CHARS = 900_000;

export async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file couldn't be read as an image."));
      i.src = url;
    });
    let maxW = 2400;
    let quality = 0.82;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, maxW / img.naturalWidth, (maxW * 0.75) / img.naturalHeight);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= MAX_CHARS) return { data, w, h };
      if (quality > 0.6) quality -= 0.1; else maxW = Math.round(maxW * 0.8);
    }
    throw new Error('That image is too detailed to store. Try a smaller one.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
