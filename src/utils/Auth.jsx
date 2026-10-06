import { getDeviceUUID } from './DeviceUuid';
import { clearCache } from '../lib/memoryCache';

const SESSION_KEYS = [
  'crm_auth_token',
  'crm_user',
  'crm_company',
  'crm_otp_session',
  'crm_otp_email',
];

export function clearSessionStorage() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  // Per-tab state from lib/memoryCache and the sign-in flow: nothing of the
  // previous account should be on screen for whoever signs in next.
  clearCache();
  try {
    ['crm_otp_session', 'crm_otp_email', 'current_shipment_uuid'].forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* storage refused */
  }
  document.cookie = 'crm_auth_token=; Max-Age=0; path=/; SameSite=Lax';
}

export function logout(navigate) {
  clearSessionStorage();
  navigate('/', { replace: true });
}
