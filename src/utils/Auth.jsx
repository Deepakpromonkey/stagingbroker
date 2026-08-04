import { getDeviceUUID } from './DeviceUuid';

const SESSION_KEYS = [
  'crm_auth_token',
  'crm_user',
  'crm_company',
  'crm_otp_session',
  'crm_otp_email',
];

export function clearSessionStorage() {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  document.cookie = 'crm_auth_token=; Max-Age=0; path=/; SameSite=Lax';
}

export function logout(navigate) {
  clearSessionStorage();
  navigate('/', { replace: true });
}
