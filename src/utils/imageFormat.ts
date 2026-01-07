// Utilities to normalize image formats before OCR/AI processing
// Some mobile devices (e.g., Samsung S-series) may produce HEIC/HEIF photos which are not consistently supported.

export const isHeicLike = (file: File) => {
  const t = (file.type || '').toLowerCase();
  if (t === 'image/heic' || t === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
};

/**
 * Ensures the returned file is a browser/AI friendly format (JPEG) when the input is HEIC/HEIF.
 * Keeps the original filename to avoid breaking "match by name" logic in the app.
 */
export const ensureJpegCompatible = async (file: File): Promise<File> => {
  if (!isHeicLike(file)) return file;

  // Dynamic import keeps initial bundle smaller.
  const mod = await import('heic2any');
  const heic2any = (mod as any).default as (opts: any) => Promise<Blob | Blob[]>;

  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });

  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  return new File([jpegBlob], file.name, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
};
