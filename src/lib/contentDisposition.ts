const DEFAULT_DOWNLOAD_FILENAME = "PROCURAÇÃO AD JUDICIA.docx";

function decodeExtendedFilename(value: string) {
  const encodedValue = value.replace(/^[^']*'[^']*'/, "");

  try {
    return decodeURIComponent(encodedValue);
  } catch {
    return encodedValue;
  }
}

function safeFilename(filename: string) {
  return filename
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\([\\"])/g, "$1")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\r\n]/g, "")
    .trim();
}

export function getFilenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) return DEFAULT_DOWNLOAD_FILENAME;

  const extendedMatch = contentDisposition.match(/(?:^|;)\s*filename\*\s*=\s*([^;]+)/i);
  if (extendedMatch) {
    const filename = safeFilename(decodeExtendedFilename(extendedMatch[1].trim()));
    if (filename) return filename;
  }

  const filenameMatch = contentDisposition.match(/(?:^|;)\s*filename\s*=\s*("(?:\\.|[^"])*"|[^;]+)/i);
  const filename = filenameMatch ? safeFilename(filenameMatch[1].trim()) : undefined;

  return filename || DEFAULT_DOWNLOAD_FILENAME;
}
