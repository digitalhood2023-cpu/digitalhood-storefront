const MAX_SOURCE_BYTES = 24 * 1024 * 1024
const MAX_UPLOAD_BYTES = 1_500_000
const MAX_IMAGE_EDGE = 1600

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('This browser could not prepare the selected photo.'))
      },
      'image/jpeg',
      quality
    )
  })
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function getOutputName(name: string) {
  const stem = name.replace(/\.[^.]+$/, '').trim() || 'product-photo'
  return `${stem.slice(0, 80)}-search.jpg`
}

export async function prepareImageSearchFile(file: File): Promise<File> {
  if (!file || file.size <= 0) {
    throw new Error('Choose a photo to search.')
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image from your camera or gallery.')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That photo is too large. Choose one smaller than 24MB.')
  }

  let source: ImageBitmap | HTMLImageElement | null = null

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        source = await createImageBitmap(file, {
          imageOrientation: 'from-image',
        })
      } catch {
        source = await loadImageElement(file)
      }
    } else {
      source = await loadImageElement(file)
    }

    const sourceWidth =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width
    const sourceHeight =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height

    if (!sourceWidth || !sourceHeight) {
      throw new Error('That photo could not be read. Try another image.')
    }

    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight))
    const width = Math.max(1, Math.round(sourceWidth * scale))
    const height = Math.max(1, Math.round(sourceHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    })

    if (!context) {
      throw new Error('This browser could not prepare the selected photo.')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(source, 0, 0, width, height)

    let output = await canvasToBlob(canvas, 0.84)

    if (output.size > MAX_UPLOAD_BYTES) {
      output = await canvasToBlob(canvas, 0.72)
    }

    if (output.size > MAX_UPLOAD_BYTES) {
      output = await canvasToBlob(canvas, 0.62)
    }

    return new File([output], getOutputName(file.name), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch (error) {
    if (
      file.size <= 8 * 1024 * 1024 &&
      [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/avif',
        'image/heic',
        'image/heif',
      ].includes(file.type)
    ) {
      return file
    }

    throw error instanceof Error
      ? error
      : new Error('That photo could not be prepared. Try another image.')
  } finally {
    if (source && 'close' in source && typeof source.close === 'function') {
      source.close()
    }
  }
}
