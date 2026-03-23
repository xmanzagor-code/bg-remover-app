import { removeBackground } from '@imgly/background-removal';

const MAX_MOBILE_DIMENSION = 640;

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

    // Optimized configuration for Isolated: Yes, SAB: Yes
    const blob = await removeBackground(source, {
      progress: (key: string, current: number, total: number) => {
        if (onProgress) {
          onProgress(key, current, total);
        }
      },
      debug: true,
      device: undefined, // Let the library auto-detect (gpu/cpu)
      model: 'isnet_fp16'
    });
    return blob;
  } catch (error: any) {
    console.error('Core error removing background:', error);
    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated ? 'Yes' : 'No';
    const hasSAB = typeof SharedArrayBuffer !== 'undefined' ? 'Yes' : 'No';
    const detailedMsg = (error?.message || 'WASM/Memory Error') + ` (Isolated: ${isIsolated}, SAB: ${hasSAB})`;
    throw new Error(detailedMsg);
  }
};

async function resizeImageIfNeeded(blob: Blob, maxDim: number): Promise<Blob> {
  console.log("Resizing check:", blob.size, "Max:", maxDim);
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxDim && img.height <= maxDim) {
        console.log("No resize needed:", img.width, "x", img.height);
        resolve(blob);
        return;
      }

      console.log("Resizing from:", img.width, "x", img.height);
      const ratio = Math.min(maxDim / img.width, maxDim / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Canvas context failed");
        resolve(blob);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((result) => {
        if (result) console.log("Resized to:", result.size);
        resolve(result || blob);
      }, 'image/jpeg', 0.9);
    };
    img.onerror = (e) => {
      console.error("Image load failed for resize:", e);
      resolve(blob);
    };
  });
}
