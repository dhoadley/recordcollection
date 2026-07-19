import { supabase } from '../supabaseClient'

const BUCKET = 'cover-art'

// Downscales/compresses an image file in the browser (canvas, no extra
// dependency) so uploads stay small — a raw phone photo is a few MB but
// looks identical on a ~250px grid tile at 800px/JPEG.
export function resizeImage(file, maxDim = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > height) {
        if (width > maxDim) {
          height = Math.round(height * (maxDim / width))
          width = maxDim
        }
      } else if (height > maxDim) {
        width = Math.round(width * (maxDim / height))
        height = maxDim
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl)
          if (blob) resolve(blob)
          else reject(new Error('Could not process image'))
        },
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image'))
    }
    img.src = objectUrl
  })
}

// Resizes and uploads a user photo as a record's cover art, overwriting any
// previous upload for the same record. Returns a cache-busted public URL.
export async function uploadCoverArt(table, id, file) {
  const blob = await resizeImage(file)
  const path = `${table}/${id}.jpg`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
