function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

export const env = {
  get SUPABASE_URL() { return required("SUPABASE_URL") },
  get SUPABASE_SERVICE_ROLE_KEY() { return required("SUPABASE_SERVICE_ROLE_KEY") },
  STORAGE_BUCKET: process.env.STORAGE_BUCKET ?? "frame-assets",
  PORT: Number(process.env.PORT ?? 3001),
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV ?? "development",
}
