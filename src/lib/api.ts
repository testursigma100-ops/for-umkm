import { Capacitor } from '@capacitor/core';

/**
 * Returns the base API URL based on the runtime environment.
 * - For native Capacitor apps (Android/iOS), it resolves to the remote production backend (Railway)
 *   or custom VITE_API_BASE_URL.
 * - For browser/web deployments, it returns an empty string to use relative paths like `/api/chat`.
 */
export function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_BASE_URL || 'https://bisnisku.up.railway.app';
  }
  return import.meta.env.VITE_API_BASE_URL || '';
}
