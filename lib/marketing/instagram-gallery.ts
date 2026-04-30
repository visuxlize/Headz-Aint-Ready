/**
 * Gallery images for public marketing pages (@headzaintready.nyc).
 * Use `https://www.instagram.com/p/<SHORTCODE>/media/?size=l` so URLs stay stable across devices.
 *
 * @see https://www.instagram.com/headzaintready.nyc
 */
export const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/headzaintready.nyc'

export type InstagramGalleryPhoto = {
  postUrl: string
  alt: string
  src: string
}

/** Instagram media id from path like `…/432602196_18490638913040453_n.jpg` — used to avoid duplicate tiles. */
function mediaIdFromSrc(src: string): string {
  const m = src.match(/\/(\d+_\d+)_n\.(jpg|jpegr|webp)/i)
  return m ? m[1] : src
}

function dedupeGallery(rows: InstagramGalleryPhoto[]): InstagramGalleryPhoto[] {
  const seen = new Set<string>()
  const out: InstagramGalleryPhoto[] = []
  for (const row of rows) {
    const id = mediaIdFromSrc(row.src)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(row)
  }
  return out
}

function buildInstagramMediaUrl(postUrl: string): string {
  const normalized = postUrl.endsWith('/') ? postUrl : `${postUrl}/`
  return `${normalized}media/?size=l`
}

const instagramGalleryPhotosRaw: InstagramGalleryPhoto[] = [
  { postUrl: 'https://www.instagram.com/p/C4jR-uqxqZd/', alt: 'Headz Ain’t Ready — from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/DGJNcEuPuGo/', alt: 'Headz Ain’t Ready — work from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/C_5yoYEx3LJ/', alt: 'Headz Ain’t Ready — lineup from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/C5UOiA1xBBc/', alt: 'Headz Ain’t Ready — fresh cut from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/ClzYHovO_wA/', alt: 'Headz Ain’t Ready — shop photo from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/ClzaV6COyWx/', alt: 'Headz Ain’t Ready — style from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/ClzY-cOu6sB/', alt: 'Headz Ain’t Ready — barbershop from Instagram', src: '' },
  { postUrl: 'https://www.instagram.com/p/CEutbC5j1pw/', alt: 'Headz Ain’t Ready — classic cut from Instagram', src: '' },
].map((item) => ({
  ...item,
  src: buildInstagramMediaUrl(item.postUrl),
}))

export const instagramGalleryPhotos = dedupeGallery(instagramGalleryPhotosRaw)
