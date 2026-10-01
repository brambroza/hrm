/**
 * @file Reads the phone's position once, with a time limit and plain-language errors.
 */

/** What to tell the user for each geolocation failure. */
export const LOCATION_ERRORS = {
  unsupported: 'เครื่องนี้ไม่รองรับการระบุตำแหน่ง',
  denied: 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งให้เบราว์เซอร์หรือ LINE แล้วลองใหม่',
  unavailable: 'หาตำแหน่งไม่ได้ ลองใหม่ในที่โล่ง',
  timeout: 'หาตำแหน่งไม่ทันเวลา ลองใหม่อีกครั้ง',
};

/**
 * Translate a GeolocationPositionError into a sentence.
 * @param {{ code?: number } | null | undefined} error - The browser's error.
 * @returns {string} The sentence.
 */
export const describeLocationError = (error) => {
  switch (error?.code) {
    case 1:
      return LOCATION_ERRORS.denied;
    case 3:
      return LOCATION_ERRORS.timeout;
    default:
      return LOCATION_ERRORS.unavailable;
  }
};

/**
 * Read the current position.
 * @param {Geolocation} [geolocation] - The API; defaults to the browser's.
 * @param {number} [timeoutMs] - How long to wait for a fix.
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number, at: string }>} The position.
 * @throws {Error} With a message from LOCATION_ERRORS when it cannot be read.
 */
export const locate = (geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new Error(LOCATION_ERRORS.unsupported));
      return;
    }
    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          at: new Date(position.timestamp || Date.now()).toISOString(),
        }),
      (error) => reject(new Error(describeLocationError(error))),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
