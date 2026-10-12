"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { UserIcon } from "@/components/member/MemberIcons";
import { compressImage, ImageCompressionError } from "@/lib/image-compress";
import { describeUploadError, uploadProfilePicture } from "@/lib/api/profile-picture";

/**
 * Choose, preview, compress and upload a profile photo. Used by the
 * first-sign-in flow (with `onSkip`) and by Settings (with `onCancel`).
 * The photo is compressed in the browser first (see lib/image-compress),
 * so only a ~100-200 KB JPEG ever leaves the device.
 */
export function ProfilePhotoPicker({
  onUploaded,
  onSkip,
  skipLabel = "Skip for now",
  submitLabel = "Save photo",
}: {
  /** Called with the saved picture URL once the upload and save succeed. */
  onUploaded: (pictureUrl: string) => void;
  /** When set, a skip button is shown (first sign-in). */
  onSkip?: () => void;
  skipLabel?: string;
  submitLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<{ blob: Blob; previewUrl: string } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Release the preview's object URL when it is replaced or the picker unmounts.
  const previewUrl = prepared?.previewUrl;
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const { blob } = await compressImage(file);
      setPrepared({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch (err) {
      setPrepared(null);
      setError(
        err instanceof ImageCompressionError
          ? err.message
          : "That photo could not be read. Please try a different one."
      );
    } finally {
      setPreparing(false);
    }
  }

  async function handleUpload() {
    if (!prepared || uploading) return;
    setError(null);
    setUploading(true);
    try {
      onUploaded(await uploadProfilePicture(prepared.blob));
    } catch (err) {
      setError(describeUploadError(err));
      setUploading(false);
    }
  }

  const busy = preparing || uploading;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-brand-line bg-brand-line/25 text-brand-ink/40">
        {prepared ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prepared.previewUrl} alt="Your selected photo" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-16 w-16" />
        )}
      </div>

      <input
        ref={inputRef}
        id="profile-photo"
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a photo"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full"
      >
        {preparing ? "Preparing photo…" : prepared ? "Choose a different photo" : "Take or choose a photo"}
      </Button>

      {prepared ? (
        <p className="text-xs text-brand-ink/60">
          Ready to upload ({Math.max(1, Math.round(prepared.blob.size / 1024))} KB)
        </p>
      ) : (
        <p className="text-center text-xs text-brand-ink/60">
          Use a clear, front-facing passport-style photo on a plain background.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-center text-sm font-semibold text-status-bad">
          {error}
        </p>
      ) : null}

      <Button type="button" onClick={handleUpload} disabled={!prepared || busy} className="w-full">
        {uploading ? "Uploading…" : submitLabel}
      </Button>

      {onSkip ? (
        <Button type="button" variant="ghost" onClick={onSkip} disabled={busy} className="w-full">
          {skipLabel}
        </Button>
      ) : null}
    </div>
  );
}
