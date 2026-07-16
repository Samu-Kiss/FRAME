import { supabaseAdmin } from "./supabase.js"
import { env } from "../env.js"

let bucketReady = false
let publicBucketReady = false

// Private bucket: generated exports (signed URLs). Public bucket: images
// that render in <img> tags (moodboard, references) — unguessable paths.
const PUBLIC_BUCKET = `${env.STORAGE_BUCKET}-public`

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(env.STORAGE_BUCKET)
  if (!data) {
    await supabaseAdmin.storage.createBucket(env.STORAGE_BUCKET, { public: false })
  }
  bucketReady = true
}

async function ensurePublicBucket() {
  if (publicBucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(PUBLIC_BUCKET)
  if (!data) {
    await supabaseAdmin.storage.createBucket(PUBLIC_BUCKET, {
      public: true,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
    })
  }
  publicBucketReady = true
}

/** Uploads an image to the public bucket and returns its permanent URL. */
export async function uploadPublicImage(params: {
  projectId: string
  scope: string // e.g. "moodboard"
  filename: string
  body: Buffer | Uint8Array
  contentType: string
}): Promise<{ storagePath: string; publicUrl: string }> {
  await ensurePublicBucket()
  const safeName = params.filename.replace(/[^\w.\-]+/g, "_").slice(-80)
  const storagePath = `projects/${params.projectId}/${params.scope}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`

  const { error } = await supabaseAdmin.storage
    .from(PUBLIC_BUCKET)
    .upload(storagePath, params.body, { contentType: params.contentType })
  if (error) throw error

  const { data } = supabaseAdmin.storage.from(PUBLIC_BUCKET).getPublicUrl(storagePath)
  return { storagePath, publicUrl: data.publicUrl }
}

/**
 * Uploads a generated export and returns a signed URL (TTL 1h — §2.9).
 * Same code path against Supabase local (dev) and Supabase cloud (prod).
 */
export async function uploadExport(params: {
  projectId: string
  filename: string
  body: Buffer | Uint8Array
  contentType: string
}): Promise<{ storagePath: string; signedUrl: string }> {
  await ensureBucket()
  const storagePath = `exports/${params.projectId}/${Date.now()}-${params.filename}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(env.STORAGE_BUCKET)
    .upload(storagePath, params.body, { contentType: params.contentType, upsert: true })
  if (uploadError) throw uploadError

  const { data, error: signError } = await supabaseAdmin.storage
    .from(env.STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)
  if (signError || !data) throw signError ?? new Error("Could not sign export URL")

  return { storagePath, signedUrl: data.signedUrl }
}
