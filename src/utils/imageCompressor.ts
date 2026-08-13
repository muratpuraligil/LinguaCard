/**
 * High-performance image compression utility for AI OCR.
 * Resizes large screenshots/photos to max 1200px and outputs a lightweight base64 JPEG.
 */
export async function compressImage(fileOrBlob: File | Blob, maxDimension: number = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Canvas context2d oluşturulamadı"));
        return;
      }

      // Fill white background (useful for PNG with transparency)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG data URL (quality 0.8 is crystal clear for OCR)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel yüklenemedi veya okunamadı."));
    };

    img.src = url;
  });
}
