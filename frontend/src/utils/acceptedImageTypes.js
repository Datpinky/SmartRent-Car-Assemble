export const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const ACCEPTED_IMAGE_INPUT_ACCEPT = [...ACCEPTED_IMAGE_MIME_TYPES, ...ACCEPTED_IMAGE_EXTENSIONS].join(',');

export function isAcceptedImageFile(file) {
  return Boolean(file && ACCEPTED_IMAGE_MIME_TYPES.includes(file.type));
}
