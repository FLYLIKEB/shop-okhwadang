

export interface UploadedFile {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

async function uploadToEndpoint(endpoint: string, file: File): Promise<UploadedFile> {
  const url = `/api${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error((error as { message?: string }).message || `HTTP ${response.status}`);
  }
  return response.json() as Promise<UploadedFile>;
}

export const uploadImage = (file: File): Promise<UploadedFile> =>
  uploadToEndpoint('/upload/image', file);

export const uploadReviewImage = (file: File): Promise<UploadedFile> =>
  uploadToEndpoint('/reviews/upload-image', file);
