import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

const BUCKET = "pinnit-app";
const AVATAR_FOLDER = "avatars";

const ALLOWED_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function normalizeContentType(mime: string): string {
  const normalized = mime?.toLowerCase?.()?.trim?.() || "image/jpeg";
  return ALLOWED_MIMES.includes(normalized as (typeof ALLOWED_MIMES)[number])
    ? normalized
    : "image/jpeg";
}

/**
 * Upload profile image to Supabase Storage (bucket: pinnit-app, path: avatars/{userId}.ext).
 * Returns the public URL of the uploaded file.
 */
export async function uploadProfileImage(
  userId: string,
  base64Data: string,
  contentType: string = "image/jpeg"
): Promise<string> {
  const contentTypeNorm = normalizeContentType(contentType);
  const ext = extFromMime(contentTypeNorm);
  const path = `${AVATAR_FOLDER}/${userId}.${ext}`;
  const arrayBuffer = decode(base64Data);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: contentTypeNorm,
      upsert: true,
    });

  if (error) throw error;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}
