import { v2 as cloudinary } from 'cloudinary'

if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    secure: true,
  })
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

/**
 * Uploads an image (base64 or URL) to a specific folder.
 * @param image The image source (base64 string or remote URL)
 * @param options Upload options (folder, public_id, etc.)
 */
export async function uploadImage(
  image: string,
  options: {
    folder: string
    public_id?: string
    overwrite?: boolean
    invalidate?: boolean
  }
) {
  try {
    const result = await cloudinary.uploader.upload(image, {
      ...options,
      resource_type: 'image',
    })
    return result.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload image to Cloudinary')
  }
}

/**
 * Deletes a single resource from Cloudinary.
 * @param publicId The public ID of the resource
 */
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    // We don't necessarily want to fail the whole operation if a delete fails
    // especially if it's already gone.
    return null
  }
}

/**
 * Deletes all assets in a folder and then the folder itself.
 * Note: Cloudinary doesn't have a single "delete folder" for non-empty folders.
 * We must delete all resources in it first.
 * @param folderPath The path of the folder to delete (e.g. "fquiz/quizzes/123")
 */
export async function deleteFolder(folderPath: string) {
  try {
    // 1. Delete all resources in the folder
    await cloudinary.api.delete_resources_by_prefix(folderPath)
    
    // 2. Delete the subfolders (if any)
    // This is optional if we know it's a flat structure, but safer for cleanup.
    await cloudinary.api.delete_folder(folderPath)

    return true
  } catch (error) {
    console.error('Cloudinary folder delete error:', error)
    return false
  }
}

/**
 * Extract public_id from a Cloudinary URL to allow deletion.
 * URL: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/name.jpg
 * Public ID: folder/name
 */
export function getPublicIdFromUrl(url: string): string | null {
  if (!url?.includes('res.cloudinary.com')) return null
  
  try {
    const parts = url.split('/')
    const uploadIndex = parts.indexOf('upload')
    if (uploadIndex === -1) return null
    
    // The public_id starts after the version part (e.g. "v12345678")
    // If there is no version part, it might be right after "upload/"
    const publicIdWithExt = parts.slice(uploadIndex + 2).join('/')
    // Remove the extension
    const publicId = publicIdWithExt.split('.').slice(0, -1).join('.')
    return publicId
  } catch {
    return null
  }
}
