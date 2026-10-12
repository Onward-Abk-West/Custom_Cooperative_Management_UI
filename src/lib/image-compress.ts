/**
 * Browser-side photo compression, run before a profile picture is sent to
 * Cloudinary. A phone camera produces 3-12 MB files; a member's avatar
 * needs a fraction of that, so the photo is decoded (honouring its EXIF
 * orientation, so portraits are not saved sideways), scaled down so its
 * longest side is at most `maxDimension`, and re-encoded as JPEG at the
 * highest quality that keeps it under `maxBytes`.
 *
 * Compression is a convenience for the member's data and Cloudinary
 * bandwidth, not a security control: the backend's signed authorization
 * is what bounds what Cloudinary will accept.
 */

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface CompressOptions {
  /** Longest side, in pixels. */
  maxDimension?: number;
  /** Target size ceiling for the encoded JPEG. */
  maxBytes?: number;
}

/** Anything larger is refused before decoding, to protect a phone's memory. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const SHRINK_FACTOR = 0.8;
const MAX_SHRINK_ATTEMPTS = 6;

const UNREADABLE =
  "That photo could not be read. Choose a JPG, PNG or WebP image, or take a new photo.";

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder, which supports a few formats
      // (and older browsers) that createImageBitmap does not.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageCompressionError(UNREADABLE);
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ImageCompressionError(UNREADABLE)),
      "image/jpeg",
      quality
    );
  });
}

export async function compressImage(
  file: File,
  { maxDimension = 800, maxBytes = 200 * 1024 }: CompressOptions = {}
): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new ImageCompressionError("Choose an image file (JPG, PNG or WebP).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageCompressionError("That photo is too large. Choose one under 25 MB.");
  }

  const decoded = await decode(file);
  try {
    if (!decoded.width || !decoded.height) throw new ImageCompressionError(UNREADABLE);

    let longestSide = maxDimension;
    for (let attempt = 0; attempt < MAX_SHRINK_ATTEMPTS; attempt += 1) {
      const scale = Math.min(1, longestSide / Math.max(decoded.width, decoded.height));
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new ImageCompressionError(UNREADABLE);
      // JPEG has no alpha channel; without this a transparent PNG turns black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await toJpeg(canvas, quality);
        if (blob.size <= maxBytes) return { blob, width, height };
      }
      longestSide = Math.round(longestSide * SHRINK_FACTOR);
    }
    throw new ImageCompressionError(
      "That photo could not be made small enough. Try a different one."
    );
  } finally {
    decoded.release();
  }
}
