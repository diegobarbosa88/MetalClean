import slugifyLib from 'slugify'

export function createSlug(text: string, suffix?: string): string {
  const base = slugifyLib(text, { lower: true, strict: true, locale: 'pt' })
  return suffix ? `${base}-${suffix}` : base
}

export function createUniqueSlug(text: string): string {
  const timestamp = Date.now().toString(36)
  return createSlug(text, timestamp)
}
