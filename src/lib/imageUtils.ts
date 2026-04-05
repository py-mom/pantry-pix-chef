// src/lib/imageUtils.ts
// Reads an image file as a base64 data URL for the Anthropic vision API.
// Supports: image/jpeg, image/png, image/gif, image/webp
// Note: HEIC/HEIF (iPhone default) is not supported — use JPEG or PNG.

export function fileToSafeDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
