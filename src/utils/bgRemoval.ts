import { removeBackground } from '@imgly/background-removal';

const MAX_MOBILE_DIMENSION = 1000;

export const processImage = async (
  imageSource: Blob | string,
  onProgress?: (key: string, current: number, total: number) => void
): Promise<Blob> => {
  try {
    let source = imageSource;

    // Mobile check & auto-resize to prevent OOM
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && imageSource instanceof Blob) {
      source = await resizeImageIfNeeded(imageSource, MAX_MOBILE_DIMENSION);
    }

    // Maximum compatibility configuration
    const blob = await removeBackground(source, {
      progress: (key: string, current: number, total: number) => {
        if (onProgress) {
          onProgress(key, current, total);
        }
      },
      debug: true,
      device: 'cpu', // Force CPU to avoid WebGL driver crashes on non-standard Android (Vivo/Oppo/etc)
      model: 'isnet_quint8'
    });
    return blob;
  } catch (error: any) {
    console.error('Core error removing background:', error);
    // Provide a more descriptive error for the UI if possible
    const detailedMsg = error?.message || 'WASM/Memory Error';
    throw new Error(detailedMsg);
  }
};

async function resizeImageIfNeeded(blob: Blob, maxDim: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxDim && img.height <= maxDim) {
        resolve(blob);
        return;
      }

      const ratio = Math.min(maxDim / img.width, maxDim / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((result) => resolve(result || blob), 'image/jpeg', 0.9);
    };
    img.onerror = () => resolve(blob);
  });
}
