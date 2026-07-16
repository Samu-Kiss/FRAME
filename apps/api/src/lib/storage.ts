import { supabaseAdmin } from "./supabase.js"
import { env } from "../env.js"

let bucketReady = false

async function ensureBucket() {
  if (bucketReady) return
  const { data } = await supabaseAdmin.storage.getBucket(env.STORAGE_BUCKET)
  if (!data) {
    await supabaseAdmin.storage.createBucket(env.STORAGE_BUCKET, { public: false })
  }
  bucketReady = true
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
