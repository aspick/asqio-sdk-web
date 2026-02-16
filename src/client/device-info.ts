export interface DeviceInfo {
  platform: 'web';
  os_version: string;
  device_model: string;
  locale: string;
  timezone: string;
}

export function detectDeviceInfo(): DeviceInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  return {
    platform: 'web',
    os_version: detectOS(ua),
    device_model: detectBrowser(ua),
    locale:
      typeof navigator !== 'undefined' ? navigator.language : 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function detectOS(ua: string): string {
  if (/Windows NT ([\d.]+)/.test(ua)) return `Windows ${RegExp.$1}`;
  if (/Mac OS X ([\d_]+)/.test(ua)) return `macOS ${RegExp.$1.replace(/_/g, '.')}`;
  if (/Android ([\d.]+)/.test(ua)) return `Android ${RegExp.$1}`;
  if (/iPhone OS ([\d_]+)/.test(ua)) return `iOS ${RegExp.$1.replace(/_/g, '.')}`;
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectBrowser(ua: string): string {
  if (/Edg\/([\d.]+)/.test(ua)) return `Edge ${RegExp.$1}`;
  if (/Chrome\/([\d.]+)/.test(ua)) return `Chrome ${RegExp.$1}`;
  if (/Firefox\/([\d.]+)/.test(ua)) return `Firefox ${RegExp.$1}`;
  if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) return `Safari ${RegExp.$1}`;
  return ua || 'Unknown';
}
