const MAX_DIMENSION = 800;
const WEBP_QUALITY = 0.8;
const JPEG_QUALITY = 0.85;

let webpExportSupported: boolean | null = null;

/** Not every browser can *encode* webp via canvas (Safari's support has been
 *  inconsistent across versions, even though it can display webp fine), so
 *  this is checked once and cached rather than assumed. */
function supportsWebpExport(): boolean {
  if (webpExportSupported != null) return webpExportSupported;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpExportSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpExportSupported;
}

/**
 * Downscales an image file client-side before upload, so the admin's phone
 * photo (often several MB, several thousand px wide) never has to be stored
 * or downloaded at full size just to render a ~150px avatar. Falls back to
 * returning the original file untouched whenever anything about this isn't
 * safe (not an image, animated gif, decode failure, or resizing didn't
 * actually shrink it) rather than risk breaking an upload.
 */
export async function resizeImageFile(file: File, maxDimension: number = MAX_DIMENSION): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // avoid flattening animation to a single frame

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // e.g. a format the browser can't decode (some HEIC cases)
  }

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const useWebp = supportsWebpExport();
  const mimeType = useWebp ? "image/webp" : "image/jpeg";
  const quality = useWebp ? WEBP_QUALITY : JPEG_QUALITY;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob || blob.size >= file.size) return file; // already small enough, don't re-encode for nothing

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const extension = useWebp ? "webp" : "jpg";
  return new File([blob], `${baseName}.${extension}`, { type: mimeType });
}
