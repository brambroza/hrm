import { supabase } from '@/lib/customSupabaseClient';
import { prepareAvatarImage } from '@/utils/image';

/** Storage bucket holding employee photos. Created by migration 0004. */
export const EMPLOYEE_PHOTO_BUCKET = 'employee-photos';

/**
 * Build the storage path for a photo.
 *
 * The organization id leads the path so the storage policies can scope access
 * the same way the table policies do — one tenant cannot read or overwrite
 * another tenant's staff photos.
 *
 * @param {string} organizationId
 * @param {string} extension
 */
const buildPath = (organizationId, extension) => {
  const unique = crypto.randomUUID();
  return `${organizationId}/${unique}.${extension}`;
};

/**
 * Shrink a picked image and store it, returning a URL the app can render.
 *
 * The photo is uploaded before the employee row exists, which is why the file
 * name is a fresh UUID rather than the employee id. If the form is abandoned
 * the object is simply never referenced; `deleteEmployeePhoto` cleans up when
 * the user removes a photo they had just added.
 *
 * @param {File} file
 * @param {string} organizationId
 * @returns {Promise<{url: string, path: string, error: Error|null}>}
 */
export const uploadEmployeePhoto = async (file, organizationId) => {
  if (!organizationId) {
    return { url: null, path: null, error: new Error('missing-organization') };
  }

  try {
    const { blob, extension } = await prepareAvatarImage(file);
    const path = buildPath(organizationId, extension);

    const { error: uploadError } = await supabase.storage
      .from(EMPLOYEE_PHOTO_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(EMPLOYEE_PHOTO_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path, error: null };
  } catch (error) {
    return { url: null, path: null, error };
  }
};

/**
 * Remove a photo that is no longer referenced.
 *
 * Failure is reported but not thrown: an orphaned object costs a few kilobytes,
 * whereas blocking the form over it costs the user their work.
 *
 * @param {string} path  the storage path returned by uploadEmployeePhoto
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteEmployeePhoto = async (path) => {
  if (!path) return { error: null };

  const { error } = await supabase.storage.from(EMPLOYEE_PHOTO_BUCKET).remove([path]);
  if (error) {
    console.error('Failed to remove employee photo:', error);
  }
  return { error: error ?? null };
};
