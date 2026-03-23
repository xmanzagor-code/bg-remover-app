import { removeBackground } from '@imgly/background-removal';

export const processImage = async (
  imageSource: Blob | string,
  onProgress?: (key: string, current: number, total: number) => void
): Promise<Blob> => {
  try {
    const blob = await removeBackground(imageSource, {
      progress: (key: string, current: number, total: number) => {
        if (onProgress) {
          onProgress(key, current, total);
        }
      }
    });
    return blob;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};
