export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_FILE_SIZE_MB = 10;
export const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_LABEL = `${MAX_UPLOAD_FILE_SIZE_MB}MB`;
export const MAX_UPLOAD_IMAGE_WIDTH = 1920;
export const MAX_UPLOAD_IMAGE_HEIGHT = 1920;
