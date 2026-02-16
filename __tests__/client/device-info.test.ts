import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectDeviceInfo } from '../../src/client/device-info';

describe('detectDeviceInfo', () => {
  // Save originals so we can restore them
  const originalNavigator = globalThis.navigator;

  function mockNavigator(userAgent: string, language = 'en-US') {
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent, language },
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    // Restore navigator after each test
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  // -----------------------------------------------------------------------
  // Structure / platform
  // -----------------------------------------------------------------------

  it('returns an object with platform set to "web"', () => {
    const info = detectDeviceInfo();
    expect(info.platform).toBe('web');
  });

  it('returns all expected keys', () => {
    const info = detectDeviceInfo();
    expect(info).toHaveProperty('platform');
    expect(info).toHaveProperty('os_version');
    expect(info).toHaveProperty('device_model');
    expect(info).toHaveProperty('locale');
    expect(info).toHaveProperty('timezone');
  });

  // -----------------------------------------------------------------------
  // OS detection
  // -----------------------------------------------------------------------

  describe('OS detection', () => {
    it('detects macOS from Chrome user agent', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('macOS 10.15.7');
    });

    it('detects Windows from Firefox user agent', () => {
      mockNavigator(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      );
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('Windows 10.0');
    });

    it('detects iOS from Safari on iPhone user agent', () => {
      mockNavigator(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      );
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('iOS 17.2.1');
    });

    it('detects Android from Chrome mobile user agent', () => {
      mockNavigator(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
      );
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('Android 14');
    });

    it('detects Linux from generic Linux user agent', () => {
      mockNavigator(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('Linux');
    });

    it('returns "Unknown" for unrecognized user agent', () => {
      mockNavigator('SomeRandomBot/1.0');
      const info = detectDeviceInfo();
      expect(info.os_version).toBe('Unknown');
    });
  });

  // -----------------------------------------------------------------------
  // Browser detection
  // -----------------------------------------------------------------------

  describe('browser detection', () => {
    it('detects Chrome', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('Chrome 120.0.0.0');
    });

    it('detects Firefox', () => {
      mockNavigator(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      );
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('Firefox 121.0');
    });

    it('detects Edge (prioritized over Chrome)', () => {
      mockNavigator(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91',
      );
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('Edge 120.0.2210.91');
    });

    it('detects Safari (when Chrome token is absent)', () => {
      mockNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      );
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('Safari 605.1.15');
    });

    it('falls back to raw user agent string for unknown browser', () => {
      mockNavigator('CustomBrowser/1.0');
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('CustomBrowser/1.0');
    });

    it('returns "Unknown" when user agent is empty', () => {
      mockNavigator('');
      const info = detectDeviceInfo();
      expect(info.device_model).toBe('Unknown');
    });
  });

  // -----------------------------------------------------------------------
  // Locale
  // -----------------------------------------------------------------------

  describe('locale', () => {
    it('uses navigator.language for locale', () => {
      mockNavigator('Mozilla/5.0', 'ja-JP');
      const info = detectDeviceInfo();
      expect(info.locale).toBe('ja-JP');
    });

    it('uses a different locale', () => {
      mockNavigator('Mozilla/5.0', 'fr-FR');
      const info = detectDeviceInfo();
      expect(info.locale).toBe('fr-FR');
    });
  });

  // -----------------------------------------------------------------------
  // Timezone
  // -----------------------------------------------------------------------

  describe('timezone', () => {
    it('returns a non-empty timezone string from Intl', () => {
      const info = detectDeviceInfo();
      expect(typeof info.timezone).toBe('string');
      expect(info.timezone.length).toBeGreaterThan(0);
    });
  });
});
