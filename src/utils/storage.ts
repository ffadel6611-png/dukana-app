/**
 * Safe LocalStorage Utility for Dukkana Market Platform
 * Prevents QuotaExceededError and quota crashes in browsers and iframes.
 */

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to read localStorage key "${key}":`, err);
    return null;
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to remove localStorage key "${key}":`, err);
  }
};

/**
 * Strips excessively large base64 data URLs from JSON strings if storage is full.
 */
function sanitizeLargePayload(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const sanitized = parsed.map(item => {
        if (item && typeof item === 'object') {
          const copy = { ...item };
          if (typeof copy.imageUrl === 'string' && copy.imageUrl.startsWith('data:image/') && copy.imageUrl.length > 60000) {
            copy.imageUrl = '';
          }
          if (typeof copy.coverUrl === 'string' && copy.coverUrl.startsWith('data:image/') && copy.coverUrl.length > 60000) {
            copy.coverUrl = '';
          }
          if (Array.isArray(copy.images)) {
            copy.images = copy.images.filter((img: unknown) => typeof img === 'string' && (!img.startsWith('data:image/') || img.length <= 60000));
          }
          return copy;
        }
        return item;
      });
      return JSON.stringify(sanitized);
    }
  } catch {
    // ignore
  }
  return value;
}

export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[Storage] Quota exceeded or error saving key "${key}". Attempting payload recovery...`, err);

    // Attempt 1: Try sanitizing payload if it contains large base64 strings
    try {
      const sanitized = sanitizeLargePayload(value);
      if (sanitized !== value) {
        localStorage.setItem(key, sanitized);
        console.info(`[Storage] Successfully saved sanitized payload for "${key}".`);
        return true;
      }
    } catch (sanitizeErr) {
      console.warn(`[Storage] Failed to save sanitized payload for "${key}":`, sanitizeErr);
    }

    // Attempt 2: Fallback to sessionStorage in case of strict origin limits
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore
    }

    return false;
  }
};

/**
 * Resizes and compresses an image File using HTML5 Canvas to prevent QuotaExceededError.
 * Returns a high-efficiency JPEG data URL (~20KB - 50KB).
 */
export const compressImageFile = (
  file: File,
  maxDimension = 640,
  quality = 0.75
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original if canvas context unavailable
          resolve(reader.result as string);
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
};
