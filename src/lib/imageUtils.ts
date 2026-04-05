// src/lib/imageUtils.ts
// Converts HEIC/HEIF images (from iPhone) to JPEG before sending to the API.
// Anthropic's vision API only accepts: image/jpeg, image/png, image/gif, image/webp.
// HEIC is Apple's default photo format and must be converted client-side.

/**
 * Takes a File and returns a base64 data URL safe to send to Anthropic.
 * HEIC/HEIF files are converted to JPEG via heic2any.
 * All other image types are read as-is.
 */
export async function fileToSafeDataUrl(file: File): Promise<string> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  if (isHeic) {
    // Dynamically import heic2any to avoid bundle bloat when not needed
    const heic2any = (await import("heic2any")).default;

    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });

    // heic2any returns a Blob or Blob[] — normalize to single Blob
    const blob = Array.isArray(converted) ? converted[0] : converted;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Non-HEIC: read normally
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
