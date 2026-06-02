export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
  ".csv",
  ".zip",
  ".rar",
  ".7z",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
  ".mp4",
  ".mp3",
  ".wav",
];

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = "20MB";

export function isAcceptedFile(file: File): boolean {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  if (ACCEPTED_FILE_EXTENSIONS.includes(ext)) return true;
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
  return false;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeForStorage(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const safe = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${safe || "file"}${ext.toLowerCase()}`;
}

export function buildStoragePath(taskId: string, fileName: string): string {
  const safe = sanitizeForStorage(fileName);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `tasks/${taskId}/${suffix}-${safe}`;
}
