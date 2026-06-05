import { ENV } from '../config/env';

interface CloudinaryResponse {
  secure_url: string;
}

export async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  const blob = new Blob([new Uint8Array(buffer)]);
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', 'unsigned_preset');
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = (await res.json()) as CloudinaryResponse;
  return data.secure_url;
}
