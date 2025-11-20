const ALLOWED_TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/vnd.ms-excel',
  'application/csv',
  'text/csv',
];

const ALLOWED_EXTENSIONS = new Set(['csv', 'json', 'txt']);

function looksLikeTextMime(mimeType) {
  if (!mimeType) return false;
  const mt = String(mimeType).toLowerCase();
  for (const prefix of ALLOWED_TEXT_MIME_PREFIXES) {
    if (mt.startsWith(prefix)) return true;
  }
  return false;
}

function extensionFromName(nameOrExt) {
  if (!nameOrExt) return '';
  const normalized = String(nameOrExt).trim().toLowerCase();
  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    return parts[parts.length - 1];
  }
  return normalized;
}

function buildFileDetail(fileMeta = {}) {
  const filename = fileMeta.originalName || fileMeta.filename || null;
  const extensionSource = fileMeta.extension || filename || '';
  const extension = extensionSource ? extensionFromName(extensionSource) : '';
  return {
    mimeType: fileMeta.mimeType || null,
    extension: extension || null,
    filename,
  };
}

async function isTextLikeFile(fileMeta = {}) {
  if (fileMeta?.mimeType) {
    if (looksLikeTextMime(fileMeta.mimeType)) return true;
    return false;
  }

  if (fileMeta?.extension) {
    const ext = extensionFromName(fileMeta.extension);
    if (ALLOWED_EXTENSIONS.has(ext)) return true;
  }

  if (fileMeta?.filename) {
    const ext = extensionFromName(fileMeta.filename);
    if (ALLOWED_EXTENSIONS.has(ext)) return true;
  }

  if (fileMeta?.originalName) {
    const ext = extensionFromName(fileMeta.originalName);
    if (ALLOWED_EXTENSIONS.has(ext)) return true;
  }

  return false;
}

async function ensureTextLikeFile(fileMeta = {}, context = 'general') {
  if (await isTextLikeFile(fileMeta)) {
    return { ...fileMeta, ...buildFileDetail(fileMeta) };
  }

  const detail = buildFileDetail(fileMeta);
  const error = new Error('unsupported_file_type');
  error.statusCode = 415;
  error.detail = detail;
  error.context = context;
  throw error;
}

module.exports = {
  isTextLikeFile,
  ensureTextLikeFile,
  ALLOWED_TEXT_MIME_PREFIXES,
  ALLOWED_EXTENSIONS,
};
