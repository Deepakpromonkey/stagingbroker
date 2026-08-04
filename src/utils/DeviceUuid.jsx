import { v4 as uuidv4 } from "uuid";

const DEVICE_UUID_KEY = "crm_device_uuid";

export const getDeviceUUID = () => {
  let deviceUUID = localStorage.getItem(DEVICE_UUID_KEY);

  if (!deviceUUID) {
    deviceUUID = uuidv4();
    localStorage.setItem(DEVICE_UUID_KEY, deviceUUID);
  }

  return deviceUUID;
};