import { removeBackground } from '@imgly/background-removal';

export const processImage = async (
  imageSource: Blob | string,
  onProgress?: (key: string, current: number, total: number) => void
): Promise<Blob> => {
  try {
    // Mobile-friendly configuration
    const blob = await removeBackground(imageSource, {
      progress: (key: string, current: number, total: number) => {
        if (onProgress) {
          onProgress(key, current, total);
        }
      },
      // Using 'cpu' can sometimes be more stable on low-end Android WebGL drivers
      // but 'auto' is generally preferred unless it fails. 
      // We'll stick to defaults but add error logging details.
      debug: true,
      model: 'isnet_fp16' // Optimized for mobile memory
    });
    return blob;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};
