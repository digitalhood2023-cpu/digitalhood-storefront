export const CHAT_MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/webm'
export const CHAT_MEDIA_BATCH_LIMIT = 5

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])
const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 8 * 1024 * 1024
const MAX_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600
const TARGET_IMAGE_BYTES = 700 * 1024
const IMAGE_QUALITIES = [0.82, 0.72, 0.62, 0.54]
const IMAGE_SCALE_STEPS = [1, 0.88, 0.76, 0.64]

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

async function decodeImage(file: File) {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      source: bitmap as CanvasImageSource,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Unable to read this image on your device.'))
      image.src = objectUrl
    })

    return {
      source: image as CanvasImageSource,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
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
    return 'Videos must be 8 MB or smaller. Trim or export the video in 720p and try again.'
  }
  return ''
}

export async function prepareChatMediaFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return file

  const decoded = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))

    if (scale === 1 && file.size <= TARGET_IMAGE_BYTES) return file

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Unable to optimize this image on this device.')

    let optimized: Blob | null = null

    for (const dimensionScale of IMAGE_SCALE_STEPS) {
      const outputWidth = Math.max(1, Math.round(width * dimensionScale))
      const outputHeight = Math.max(1, Math.round(height * dimensionScale))
      canvas.width = outputWidth
      canvas.height = outputHeight
      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(decoded.source, 0, 0, outputWidth, outputHeight)

      for (const quality of IMAGE_QUALITIES) {
        optimized = await canvasToBlob(canvas, quality)
        if (optimized.size <= TARGET_IMAGE_BYTES) break
      }

      if (optimized && optimized.size <= TARGET_IMAGE_BYTES) break
    }

    if (!optimized) throw new Error('Unable to optimize this image. Choose another file.')
    if (optimized.size > MAX_IMAGE_OUTPUT_BYTES) {
      throw new Error('This image is still too large after optimization. Choose a smaller image.')
    }

    return new File([optimized], optimizedFileName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    decoded.dispose()
  }
}
