import { supabase, getSupabaseConfig } from '../lib/supabase';

/**
 * Compresses an image file in browser using HTML5 Canvas.
 * Target max dimensions: 600x600 px, quality: 0.8
 * Output is lightweight (typically 20KB - 80KB).
 */
export async function compressImage(file: File, maxWidth = 600, maxHeight = 600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = err => reject(err);
    };
    reader.onerror = err => reject(err);
  });
}

/**
 * Uploads compressed image or returns lightweight DataURL.
 * If Supabase storage is available and accessible, uploads to product-images bucket.
 * Otherwise returns the compressed DataURL directly.
 */
export async function processProductImage(
  file: File,
  businessId?: string,
  userId?: string
): Promise<string> {
  const compressedDataUrl = await compressImage(file, 600, 600, 0.8);

  const cfg = getSupabaseConfig();
  // If Supabase is configured, optionally attempt upload to storage bucket
  if (cfg.isConfigured && (userId || businessId)) {
    try {
      // Convert DataURL to Blob
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      const fileName = `${userId || businessId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
      console.error('PRODUCT IMAGE UPLOAD ERROR:', error);
    }

    if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch {
      // Fallback seamlessly to the compressed base64 data URL
    }
  }

  return compressedDataUrl;
}
