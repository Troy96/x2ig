import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

export async function uploadImage(
  buffer: Buffer,
  folder: string = 'x2ig'
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'png',
        transformation: [
          { width: 1080, height: 1080, crop: 'pad', background: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
          })
        } else {
          reject(new Error('Upload failed: No result returned'))
        }
      }
    )

    uploadStream.end(buffer)
  })
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

export function getOptimizedUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    width: 1080,
    height: 1080,
    crop: 'pad',
  })
}
