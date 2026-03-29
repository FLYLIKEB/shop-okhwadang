export interface UploadedFile {
  url: string;
  filename: string;
}

export interface StorageAdapter {
  save(filename: string, buffer: Buffer, mimetype: string): Promise<UploadedFile>;
}
