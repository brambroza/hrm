/**
 * @file Thai font for generated PDFs.
 *
 * jsPDF's built-in fonts have no Thai glyphs, so Thai names and labels came
 * out as garbage. Sarabun (SIL Open Font License, see public/fonts) is loaded
 * on first use and embedded in each document.
 */

/** Font family name registered with jsPDF. */
export const THAI_FONT = 'Sarabun';

const FONT_FILES = [
  { file: 'Sarabun-Regular.ttf', style: 'normal' },
  { file: 'Sarabun-Bold.ttf', style: 'bold' },
];

/** Base64 font data by file name, kept so the files are fetched once per session. */
const cache = new Map();

/**
 * Encode binary data as base64 without exceeding the argument limit of
 * String.fromCharCode on large files.
 * @param {ArrayBuffer} buffer - Raw file contents.
 * @returns {string} Base64 text.
 */
export const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

/**
 * Read one font file as base64.
 * @param {string} file - File name under /fonts.
 * @param {(file: string) => Promise<ArrayBuffer>} load - Reads the file.
 * @returns {Promise<string>} Base64 font data.
 */
const readFont = async (file, load) => {
  if (!cache.has(file)) cache.set(file, toBase64(await load(file)));
  return cache.get(file);
};

/**
 * Default loader: fetch from the site's /fonts folder.
 * @param {string} file - File name.
 * @returns {Promise<ArrayBuffer>} File contents.
 * @throws {Error} When the file cannot be fetched.
 */
const fetchFont = async (file) => {
  const response = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
  if (!response.ok) throw new Error(`โหลดฟอนต์ไม่สำเร็จ: ${file}`);
  return response.arrayBuffer();
};

/**
 * Register the Thai font on a document and make it the current font.
 * @param {import('jspdf').jsPDF} doc - Document to prepare.
 * @param {(file: string) => Promise<ArrayBuffer>} [load] - Custom file reader, used by tests.
 * @returns {Promise<void>}
 */
export const useThaiFont = async (doc, load = fetchFont) => {
  for (const { file, style } of FONT_FILES) {
    doc.addFileToVFS(file, await readFont(file, load));
    doc.addFont(file, THAI_FONT, style);
  }
  doc.setFont(THAI_FONT, 'normal');
};
