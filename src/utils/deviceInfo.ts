/**
 * Client Device and Browser Detector for Session Security
 */

export interface ClientDeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export function detectClientDevice(): ClientDeviceInfo {
  if (typeof window === 'undefined' || !navigator) {
    return {
      deviceName: 'متصفح ويب غير معروف',
      browser: 'Web Browser',
      os: 'Unknown OS',
      deviceType: 'desktop',
    };
  }

  const ua = navigator.userAgent || '';
  let browser = 'متصفح ويب';
  let os = 'نظام تشغيل';
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  // 1. Detect OS
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
    os = 'iPadOS / Tablet';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    os = 'iPhone (iOS)';
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      deviceType = 'mobile';
      os = 'Android';
    } else {
      deviceType = 'tablet';
      os = 'Android Tablet';
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    os = 'macOS';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Windows';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    os = 'Linux';
  }

  // 2. Detect Browser
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  const deviceName = `${browser} على ${os}`;

  return {
    deviceName,
    browser,
    os,
    deviceType,
  };
}
