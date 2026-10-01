/**
 * @file LINE Front-end Framework (LIFF): the clock screen inside LINE.
 *
 * The SDK is loaded from LINE's CDN only when a LIFF id is configured, so the
 * ordinary site never fetches it. Everything the rest of the app needs is
 * reduced to: is this LINE, who is it, and a token the server can verify.
 */

const SDK_URL = 'https://static.line-scdn.net/liff/edge/2/sdk.js';

/** The LIFF app id from the environment; empty when LINE is not set up. */
export const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

let sdkPromise = null;

/**
 * Load the SDK script once.
 * @param {Document} [doc] - The document to add the script to.
 * @returns {Promise<object>} The global `liff` object.
 */
const loadSdk = (doc = document) => {
  if (window.liff) return Promise.resolve(window.liff);
  if (!sdkPromise) {
    sdkPromise = new Promise((resolve, reject) => {
      const script = doc.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => (window.liff ? resolve(window.liff) : reject(new Error('LIFF SDK did not load')));
      script.onerror = () => reject(new Error('LIFF SDK did not load'));
      doc.head.appendChild(script);
    });
  }
  return sdkPromise;
};

/**
 * Start LIFF and sign the user in to LINE when needed.
 *
 * Outside LINE, with a LIFF id set, the user is sent to LINE Login and comes
 * back to this page; the promise then never resolves in the first visit.
 *
 * @param {string} [liffId] - The LIFF app id.
 * @returns {Promise<{ available: boolean, inClient: boolean, idToken: string|null, logout?: () => void }>} What the screen needs.
 */
export const initLiff = async (liffId = LIFF_ID) => {
  if (!liffId) return { available: false, inClient: false, idToken: null };
  const liff = await loadSdk();
  await liff.init({ liffId });
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return new Promise(() => {});
  }
  return { available: true, inClient: liff.isInClient(), idToken: liff.getIDToken(), logout: () => liff.logout() };
};
