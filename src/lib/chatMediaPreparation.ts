export const CHAT_MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif,video/mp4,video/webm'
export const CHAT_MEDIA_BATCH_LIMIT = 5

const SERVER_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const CONVERTIBLE_IMAGE_TYPES = new Set([
  ...SERVER_IMAGE_TYPES,
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm'])
const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const MAX_VIDEO_BYTES = 20 * 1024 * 1024
const MAX_IMAGE_OUTPUT_BYTES = 5 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600
const TARGET_IMAGE_BYTES = 700 * 1024
const IMAGE_QUALITIES = [0.82, 0.72, 0.62, 0.54]
const IMAGE_SCALE_STEPS = [1, 0.88, 0.76, 0.64]

export type ChatCropAspect = 'original' | 'square' | 'portrait' | 'landscape'

export function getChatCropRatio(aspect: ChatCropAspect) {
  if (aspect === 'square') return 1
  if (aspect === 'portrait') return 4 / 5
  if (aspect === 'landscape') return 16 / 9
  return 0
}

type EncodedCanvas = {
  blob: Blob
  extension: 'webp' | 'jpg'
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      resolve,
      type,
      quality
    )
  })
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<EncodedCanvas> {
  const webp = await canvasBlob(canvas, 'image/webp', quality)
  if (webp?.type === 'image/webp') return { blob: webp, extension: 'webp' }

  const jpeg = await canvasBlob(canvas, 'image/jpeg', quality)
  if (jpeg) return { blob: jpeg, extension: 'jpg' }

  throw new Error('Unable to optimize this image. Choose another file.')
}

function optimizedFileName(name: string, extension: 'webp' | 'jpg') {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'photo'
  return `${base}.${extension}`
}

function extensionOf(file: File) {
  return file.name.split('.').pop()?.trim().toLowerCase() || ''
}

export function isChatImageFile(file: File) {
  return (
    CONVERTIBLE_IMAGE_TYPES.has(file.type.toLowerCase()) ||
    ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extensionOf(file))
  )
}

export function isChatVideoFile(file: File) {
  return (
    ALLOWED_VIDEO_TYPES.has(file.type.toLowerCase()) ||
    ['mp4', 'webm'].includes(extensionOf(file))
  )
}

async function decodeImage(file: File) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap as CanvasImageSource,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Some mobile browsers expose createImageBitmap but cannot decode camera HEIC files with it.
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
  if (!isChatImageFile(file) && !isChatVideoFile(file)) {
    return 'Use JPEG, PNG, WebP, HEIC or HEIF images, or MP4 or WebM videos.'
  }
  if (file.size <= 0) return 'One of the selected files is empty.'
  if (isChatImageFile(file) && file.size > MAX_IMAGE_INPUT_BYTES) {
    return 'Images must be 20 MB or smaller before optimization.'
  }
  if (isChatVideoFile(file) && file.size > MAX_VIDEO_BYTES) {
    return 'Videos must be 20 MB or smaller. Trim or export the video in 720p and try again.'
  }
  return ''
}

export async function prepareChatMediaFile(file: File) {
  if (!isChatImageFile(file)) {
    if (isChatVideoFile(file) && !ALLOWED_VIDEO_TYPES.has(file.type.toLowerCase())) {
      const mimeType = extensionOf(file) === 'webm' ? 'video/webm' : 'video/mp4'
      return new File([file], file.name, {
        type: mimeType,
        lastModified: file.lastModified,
      })
    }

    return file
  }

  const decoded = await decodeImage(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(decoded.width, decoded.height))
    const width = Math.max(1, Math.round(decoded.width * scale))
    const height = Math.max(1, Math.round(decoded.height * scale))

    // Always re-encode chat images before upload. Even small JPEG/PNG/WebP files can
    // contain metadata or encoding variants that browsers display correctly but the
    // stricter chat-media backend rejects. Normalizing through canvas makes edited
    // and unedited uploads follow the same reliable path.
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Unable to optimize this image on this device.')

    let optimized: EncodedCanvas | null = null

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
        if (optimized.blob.size <= TARGET_IMAGE_BYTES) break
      }

      if (optimized && optimized.blob.size <= TARGET_IMAGE_BYTES) break
    }

    if (!optimized) throw new Error('Unable to optimize this image. Choose another file.')
    if (optimized.blob.size > MAX_IMAGE_OUTPUT_BYTES) {
      throw new Error('This image is still too large after optimization. Choose a smaller image.')
    }

    return new File([optimized.blob], optimizedFileName(file.name, optimized.extension), {
      type: optimized.blob.type,
      lastModified: Date.now(),
    })
  } finally {
    decoded.dispose()
  }
}

export async function exportChatImageCanvas(
  canvas: HTMLCanvasElement,
  originalName: string
) {
  const encoded = await canvasToBlob(canvas, 0.86)

  if (encoded.blob.size > MAX_IMAGE_OUTPUT_BYTES) {
    throw new Error('This edited image is too large. Try a smaller crop.')
  }

  return new File(
    [encoded.blob],
    optimizedFileName(originalName, encoded.extension),
    {
      type: encoded.blob.type,
      lastModified: Date.now(),
    }
  )
}

export async function cropChatVideoFile(
  file: File,
  aspect: ChatCropAspect,
  onProgress?: (percentage: number) => void
) {
  const ratio = getChatCropRatio(aspect)
  if (!ratio) return file

  const canvas = document.createElement('canvas')
  const captureCanvas = canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream
  }
  const VideoWithCapture = HTMLVideoElement as unknown as {
    prototype: HTMLVideoElement & {
      captureStream?: () => MediaStream
      mozCaptureStream?: () => MediaStream
    }
  }

  if (
    typeof MediaRecorder === 'undefined' ||
    typeof captureCanvas.captureStream !== 'function' ||
    !(
      'captureStream' in VideoWithCapture.prototype ||
      'mozCaptureStream' in VideoWithCapture.prototype
    )
  ) {
    throw new Error('Video cropping is not supported by this browser. You can still send the original video.')
  }

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Unable to crop this video on this device.')

  const video = document.createElement('video') as HTMLVideoElement & {
    captureStream?: () => MediaStream
    mozCaptureStream?: () => MediaStream
  }
  const objectUrl = URL.createObjectURL(file)
  video.src = objectUrl
  video.preload = 'auto'
  video.playsInline = true
  video.volume = 0

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Unable to read this video on your device.'))
      video.load()
    })

    const sourceWidth = Math.max(1, video.videoWidth)
    const sourceHeight = Math.max(1, video.videoHeight)
    const sourceRatio = sourceWidth / sourceHeight
    const cropWidth = sourceRatio > ratio ? sourceHeight * ratio : sourceWidth
    const cropHeight = sourceRatio > ratio ? sourceHeight : sourceWidth / ratio
    const sourceX = (sourceWidth - cropWidth) / 2
    const sourceY = (sourceHeight - cropHeight) / 2
    const outputScale = Math.min(1, 1280 / Math.max(cropWidth, cropHeight))
    canvas.width = Math.max(2, Math.round(cropWidth * outputScale / 2) * 2)
    canvas.height = Math.max(2, Math.round(cropHeight * outputScale / 2) * 2)

    const outputStream = captureCanvas.captureStream(30)
    const sourceStream = video.captureStream?.() || video.mozCaptureStream?.()
    sourceStream?.getAudioTracks().forEach(track => outputStream.addTrack(track))

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(type => MediaRecorder.isTypeSupported(type))

    if (!mimeType) {
      throw new Error('This browser cannot export a cropped chat video.')
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: 2_500_000,
    })
    const completed = new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onerror = () => reject(new Error('Video cropping failed. The original video is still selected.'))
      recorder.onstop = () => resolve()
    })

    let frame = 0
    const drawFrame = () => {
      context.drawImage(
        video,
        sourceX,
        sourceY,
        cropWidth,
        cropHeight,
        0,
        0,
        canvas.width,
        canvas.height
      )
      onProgress?.(
        Math.min(99, Math.round((video.currentTime / Math.max(video.duration, 0.1)) * 100))
      )
      frame = requestAnimationFrame(drawFrame)
    }

    recorder.start(500)
    frame = requestAnimationFrame(drawFrame)
    await video.play()
    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve()
      video.onerror = () => reject(new Error('Video cropping stopped before it finished.'))
    })
    cancelAnimationFrame(frame)
    recorder.stop()
    await completed
    outputStream.getTracks().forEach(track => track.stop())
    sourceStream?.getTracks().forEach(track => track.stop())

    const blob = new Blob(chunks, { type: 'video/webm' })
    if (!blob.size || blob.size > MAX_VIDEO_BYTES) {
      throw new Error('The cropped video is too large. Try a shorter or lower-resolution clip.')
    }

    onProgress?.(100)
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'video'
    return new File([blob], `${base}-cropped.webm`, {
      type: 'video/webm',
      lastModified: Date.now(),
    })
  } finally {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(objectUrl)
  }
}
