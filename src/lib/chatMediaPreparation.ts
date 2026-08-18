export const CHAT_MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm'
export const CHAT_MEDIA_BATCH_LIMIT = 5

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])
const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 12 * 1024 * 1024
const MAX_IMAGE_EDGE = 2048
const TARGET_IMAGE_BYTES = 1.5 * 1024 * 1024

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Unable to optimize this image. Choose another file.')),
      'image/webp',
      quality
    )
  })
}

function optimizedFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'photo'
  return `${base}.webp`
}

export function validateChatMediaInput(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) && !ALLOWED_VIDEO_TYPES.has(file.type)) {
    return 'Use JPEG, PNG or WebP images, or MP4 or WebM videos.'
  }
  if (file.size <= 0) return 'One of the selected files is empty.'
  if (ALLOWED_IMAGE_TYPES.has(file.type) && file.size > MAX_IMAGE_INPUT_BYTES) {
    return 'Images must be 20 MB or smaller before optimization.'
  }
  if (ALLOWED_VIDEO_TYPES.has(file.type) && file.size > MAX_VIDEO_BYTES) {
    return 'Videos must be 12 MB or smaller. Trim or export the video in 720p and try again.'
  }
  return ''
}

export async function prepareChatMediaFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    if (scale === 1 && file.size <= TARGET_IMAGE_BYTES) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Unable to optimize this image on this device.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)

    let optimized = await canvasToBlob(canvas, 0.84)
    for (const quality of [0.76, 0.68]) {
      if (optimized.size <= TARGET_IMAGE_BYTES) break
      optimized = await canvasToBlob(canvas, quality)
    }

    if (optimized.size >= file.size && file.size <= 5 * 1024 * 1024) return file
    if (optimized.size > 5 * 1024 * 1024) {
      throw new Error('This image is still too large after optimization. Choose a smaller image.')
    }

    return new File([optimized], optimizedFileName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}
