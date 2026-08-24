/**
 * Turn a Supabase auth error into a message an HR clerk can act on.
 *
 * Supabase returns English strings aimed at developers ("Invalid login
 * credentials"), which were being shown verbatim to Thai users. Matching on the
 * message text is unavoidable — the JS client does not expose a stable error
 * code for these — so unknown errors fall back to the raw message rather than
 * being swallowed.
 *
 * @param {{message?: string, status?: number}|null} error  a Supabase auth error
 * @param {(key: string, fallback?: string) => string} t    i18next translator
 * @returns {string} a message to show the user
 */
export const describeAuthError = (error, t) => {
  if (!error) return '';

  const message = String(error.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return t('auth.invalidCredentials');
  }
  if (message.includes('email not confirmed')) {
    return t('auth.emailNotConfirmed');
  }
  if (error.status === 429 || message.includes('too many requests') || message.includes('rate limit')) {
    return t('auth.tooManyRequests');
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return t('auth.networkError');
  }

  return error.message || t('common.error');
};
