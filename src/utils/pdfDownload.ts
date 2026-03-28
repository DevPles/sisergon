import jsPDF from 'jspdf';

/**
 * Universal PDF download that works on Chrome, Firefox, Safari, Edge, etc.
 * Uses jsPDF native save as primary, with arraybuffer+blob fallback.
 */
export function downloadPdfFromDoc(doc: jsPDF, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '_');

  // Method 1: native jsPDF save (works in most browsers)
  try {
    doc.save(safe);
    return;
  } catch {
    // fallback below
  }

  // Method 2: arraybuffer → Blob → object URL
  try {
    const buf = doc.output('arraybuffer');
    const blob = new Blob([buf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safe;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  } catch {
    // fallback below
  }

  // Method 3: base64 data URI (Safari iframe edge case)
  const buf = doc.output('arraybuffer');
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const b64 = btoa(binary);
  const a = document.createElement('a');
  a.href = `data:application/pdf;base64,${b64}`;
  a.download = safe;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Load an image URL as base64 data URI */
export async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Resize image to fit within bounds for smaller PDF size */
export async function resizeImage(dataUrl: string, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Load brand logo (Ergon) */
export async function loadBrandLogo(): Promise<string | null> {
  const { default: logoUrl } = await import('@/assets/logo-ergon.png');
  const raw = await loadImageAsBase64(logoUrl);
  if (!raw) return null;
  return resizeImage(raw, 500, 200);
}
