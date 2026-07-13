/**
 * Image utility functions for handling backend-driven images and icons
 */

export interface ImageProps {
  src?: string;
  alt: string;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Get image URL from backend or return fallback
 * Handles both direct URLs and base64 encoded images
 */
export function getImageUrl(imageData?: string): string | null {
  if (!imageData) return null;
  
  // Check if it's already a full URL
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }
  
  // Check if it's base64 encoded
  if (imageData.startsWith('data:')) {
    return imageData;
  }
  
  // Build the backend base URL: env var → configured server URL → dev relative
  const configuredUrl = (localStorage.getItem('pos_api_base_url') || '')
    .replace(/\/public\/api\/v\d+\/?$/, '')
    .replace(/\/api\/v\d+\/?$/, '')
    .replace(/\/public\/?$/, '');
  const backendUrl = (
    import.meta.env.VITE_BACKEND_URL || configuredUrl || (import.meta.env.DEV ? '' : '')
  ).replace(/\/+$/, '');

  // Files are stored in public/uploads/YY/MM/file.ext and served at /uploads/...
  const cleanPath = imageData.replace(/^\/+/, '');

  if (backendUrl) {
    return `${backendUrl}/${cleanPath}`;
  }

  // Dev mode: relative path goes through Vite proxy → /uploads/... or /files/...
  return `/${cleanPath}`;
}

/**
 * Validate if an image URL is accessible
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Convert file to base64 for local storage or transmission
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Get icon for file type or category
 */
export function getIconForType(type: 'product' | 'category' | 'brand', name?: string): string {
  const icons: Record<string, string> = {
    product: '📦',
    category: '📂',
    brand: '🏷️',
    electronics: '🔌',
    clothing: '👕',
    food: '🍔',
    books: '📚',
    furniture: '🪑',
    sports: '⚽',
    toys: '🎮',
    default: '📦',
  };
  
  // Try to match by name first
  if (name) {
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
  }
  
  return icons[type] || icons.default;
}
