import {
  apiDelete,
  apiPost,
  apiPut,
  ApiError,
  type ApiEnvelope,
} from "@/lib/api-client";

/**
 * Profile-picture upload, in three hops so the image bytes never pass
 * through the API server:
 *
 *   1. POST /api/v1/profile/profile-picture/upload-authorization
 *      (AbkWestCoop.Api's ProfilePictureController) -> a short-lived,
 *      server-signed Cloudinary upload authorization scoped to THIS
 *      user's own folder. The browser cannot choose the public id, the
 *      delivery type, the formats or the transformation: they are part
 *      of the signature.
 *   2. The browser POSTs the (already compressed) image straight to
 *      Cloudinary with exactly the returned `parameters`, plus `file`,
 *      `api_key` and `signature`. Cloudinary answers with secure_url and
 *      public_id.
 *   3. PUT /api/v1/profile/profile-picture with that URL and public id,
 *      which validates both (HTTPS, this cloud, matching, and inside the
 *      caller's own folder) and saves them to the database.
 *
 * Every role may set its own picture; nobody can set another user's.
 */

export interface ProfilePictureUploadAuthorization {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  resourceType: string;
  deliveryType: string;
  allowedFormats: string[];
  maximumSizeBytes: number;
  expiresAtUtc: string;
  /** Signed fields, sent to Cloudinary verbatim. */
  parameters: Record<string, string>;
}

export interface ProfilePictureData {
  profilePictureUrl: string;
}

/**
 * Dispatched on `window` after the picture changes (url is null when it
 * was removed), so the sidebar / dashboard avatars update without a
 * reload.
 */
export const PROFILE_PICTURE_EVENT = "onward:profile-picture";

function announce(url: string | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROFILE_PICTURE_EVENT, { detail: { url } }));
  }
}

export function requestProfilePictureUploadAuthorization() {
  return apiPost<ApiEnvelope<ProfilePictureUploadAuthorization>>(
    "/api/v1/profile/profile-picture/upload-authorization"
  );
}

export function setProfilePicture(imageUrl: string, publicId: string) {
  return apiPut<ApiEnvelope<ProfilePictureData>>("/api/v1/profile/profile-picture", {
    ImageUrl: imageUrl,
    PublicId: publicId,
  });
}

export async function removeProfilePicture() {
  const response = await apiDelete<ApiEnvelope<null>>("/api/v1/profile/profile-picture");
  if (response.success) announce(null);
  return response;
}

interface CloudinaryUploadResult {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

async function uploadToCloudinary(
  authorization: ProfilePictureUploadAuthorization,
  image: Blob
): Promise<{ secureUrl: string; publicId: string }> {
  const form = new FormData();
  for (const [key, value] of Object.entries(authorization.parameters)) {
    form.append(key, value);
  }
  form.append("api_key", authorization.apiKey);
  form.append("signature", authorization.signature);
  // `file` last, as Cloudinary's own examples do.
  form.append("file", image, "profile.jpg");

  // Plain fetch: no Authorization header and no credentials — this goes
  // to Cloudinary, not to our API, and must not carry our session.
  const response = await fetch(authorization.uploadUrl, { method: "POST", body: form });
  let result: CloudinaryUploadResult | null = null;
  try {
    result = (await response.json()) as CloudinaryUploadResult;
  } catch {
    result = null;
  }
  if (!response.ok || !result?.secure_url || !result.public_id) {
    throw new Error(
      result?.error?.message
        ? `Photo upload failed: ${result.error.message}`
        : "The photo could not be uploaded. Please try again."
    );
  }
  if (result.public_id !== authorization.publicId) {
    throw new Error("The photo upload returned an unexpected result. Please try again.");
  }
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

/**
 * Runs all three hops for an already-compressed image and resolves with
 * the saved picture URL. Throws ApiError (from our API) or Error (from
 * Cloudinary / the network); use `describeUploadError` for a message.
 */
export async function uploadProfilePicture(image: Blob): Promise<string> {
  const authResponse = await requestProfilePictureUploadAuthorization();
  if (!authResponse.success || !authResponse.data) {
    throw new Error(authResponse.message || "Photo upload is not available right now.");
  }
  const authorization = authResponse.data;
  if (image.size > authorization.maximumSizeBytes) {
    throw new Error("That photo is too large to upload.");
  }

  const uploaded = await uploadToCloudinary(authorization, image);
  const saved = await setProfilePicture(uploaded.secureUrl, uploaded.publicId);
  if (!saved.success || !saved.data) {
    throw new Error(saved.message || "Your photo could not be saved.");
  }
  announce(saved.data.profilePictureUrl);
  return saved.data.profilePictureUrl;
}

export function describeUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message || "Your photo could not be saved.";
  }
  if (err instanceof TypeError) {
    return "Could not reach the server. Please check your connection and try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Your photo could not be uploaded. Please try again.";
}
