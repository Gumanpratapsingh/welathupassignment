const ALLOWED_TEXT_MIME_PREFIXES = [
    'text/',
    'application/json',
    'application/vnd.ms-excel',
    'application/csv',
    'text/csv'
];

const ALLOWED_EXTENSIONS = new Set(['csv', 'json', 'txt']);

function looksLikeTextMime(mimeType) {
    if (!mimeType) return false;
    const mt = String(mimeType).toLowerCase();
    for (const p of ALLOWED_TEXT_MIME_PREFIXES) {
        if (mt.startsWith(p)) return true;
    }
    return false;
}

function extensionFromName(nameOrExt) {
    if (!nameOrExt) return '';
    const s = String(nameOrExt).trim().toLowerCase();
    if (s.includes('.')) {
        const parts = s.split('.');
        return parts[parts.length - 1];
    }
    return s;
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

    return false;
}

module.exports = {
    isTextLikeFile,
    ALLOWED_TEXT_MIME_PREFIXES,
    ALLOWED_EXTENSIONS
};
