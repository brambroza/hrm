/** Longest edge of a stored employee photo, in pixels. */
export const AVATAR_SIZE = 512;

/** Largest file a user may pick, before processing. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Image types the picker accepts. HEIC is excluded: browsers cannot decode it. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Decode a file into something the canvas can draw.
 *
 * `createImageBitmap` is used where available because it decodes off the main
 * thread; older Safari falls back to an <img> and an object URL.
 *
 * @param {File|Blob} file
 * @returns {Promise<ImageBitmap|HTMLImageElement>}
 */
const decodeImage = async (file) => {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode-failed'));
    };
    img.src = url;
  });
};

/**
 * Crop an image to a centred square and shrink it to avatar size.
 *
 * Phone cameras produce 3-5 MB photos, and an HR clerk adding thirty staff
 * would otherwise push well over a hundred megabytes through a Thai office ADSL
 * line and into storage, to be displayed at 40 pixels across. Processing here
 * brings each photo down to roughly 30-60 KB.
 *
 * WebP is preferred; browsers that cannot encode it silently hand back a JPEG,
 * which `canvas.toBlob` signals through the resulting blob's own type.
 *
 * @param {File} file  the picked image
 * @param {{size?: number, quality?: number}} [options]
 * @returns {Promise<{blob: Blob, extension: string}>}
 */
export const prepareAvatarImage = async (file, { size = AVATAR_SIZE, quality = 0.85 } = {}) => {
  const source = await decodeImage(file);
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  // Centre square crop, so a portrait photo keeps the face rather than the feet.
  const edge = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - edge) / 2;
  const sy = (sourceHeight - edge) / 2;

  // Never upscale: a 200px source stays 200px rather than turning blurry.
  const target = Math.min(size, edge);

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, edge, edge, 0, 0, target, target);

  if (typeof source.close === 'function') source.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('encode-failed'))),
      'image/webp',
      quality,
    );
  });

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  return { blob, extension };
};

/**
 * Why a picked file cannot be used, or null when it is fine.
 *
 * @param {File} file
 * @returns {'type'|'size'|null}
 */
export const validateImageFile = (file) => {
  if (!file) return 'type';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'type';
  if (file.size > MAX_UPLOAD_BYTES) return 'size';
  return null;
};
