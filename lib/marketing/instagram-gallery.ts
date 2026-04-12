/**
 * Gallery images from Instagram post embeds (@headzaintready.nyc).
 * Use each `src` as-is (signed URL). **Tokens expire** — refresh via:
 *   curl -sL -A 'Mozilla/5.0' "https://www.instagram.com/p/<SHORTCODE>/embed/captioned/" | tr '"' '\n' | grep cdninstagram
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

/**
 * Homepage “The Work” grid: **2 columns** (`grid-cols-2`), as many unique post images as we list — no duplicate media.
 */
const instagramGalleryPhotosRaw: InstagramGalleryPhoto[] = [
  {
    postUrl: 'https://www.instagram.com/p/C4jR-uqxqZd/',
    alt: 'Headz Ain’t Ready — from Instagram',
    src: 'https://scontent-lga3-2.cdninstagram.com/v/t39.30808-6/432602196_18490638913040453_5906142504504214331_n.jpg?se=-1&stp=dst-jpegr_e35_s640x640_sh0.08_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6ImltYWdlX3VybGdlbi4xNjIweDE2MjAuaGRyLmYzMDgwOC5kZWZhdWx0X2ltYWdlLmMyIn0&_nc_ht=scontent-lga3-2.cdninstagram.com&_nc_cat=105&_nc_oc=Q6cZ2gFb67Z0cK6mGY3Aaep4tNAwJvfkCCIGxu10AA6CX3SIvGLtAb3eWkDows0fd0iqZPg&_nc_ohc=kZWCOXaFbSQQ7kNvwGSlQ7E&_nc_gid=p6Pn7vdE7HABc8SqVR12gQ&edm=APs17CUAAAAA&ccb=7-5&oh=00_Af1ujtkWBQlVDJKStTk2H8ga4ZTw0WLgK5dm2qg5Kj_HzQ&oe=69E1FA1B&_nc_sid=10d13b',
  },
  {
    postUrl: 'https://www.instagram.com/p/DGJNcEuPuGo/',
    alt: 'Headz Ain’t Ready — work from Instagram',
    src: 'https://scontent-lga3-2.cdninstagram.com/v/t51.75761-15/480147042_18555633277040453_5527143972198678852_n.jpg?stp=c217.0.654.653a_dst-jpg_e35_s640x640_tt6&_nc_cat=101&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=qEhJOpLt08sQ7kNvwFRmbEV&_nc_oc=AdornaDZMWiGO5_o310EtUJw9z-tw6i98cl5mKgvoNOJMRS41gbXR8leEmiKPitqZgg&_nc_zt=23&_nc_ht=scontent-lga3-2.cdninstagram.com&_nc_gid=7aiXidm3RjhNxX48RHTZ-g&_nc_ss=7a389&oh=00_Af0nst8TQxy1CwKi-RMaxdDRqi2i5etzOYssZxUT27JD7A&oe=69DCB270',
  },
  {
    postUrl: 'https://www.instagram.com/p/C_5yoYEx3LJ/',
    alt: 'Headz Ain’t Ready — lineup from Instagram',
    src: 'https://scontent-lga3-1.cdninstagram.com/v/t39.30808-6/473345008_18549689932040453_3482082319019010277_n.jpg?stp=c251.0.756.755a_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=pDdhw60weHIQ7kNvwEY0DTI&_nc_oc=AdryLxvtooe6ZMoAZYolE73Bi1GEG_4YykHB5zxyaZnexeKk6KnTlxYkcWJWp-F30Zo&_nc_zt=23&_nc_ht=scontent-lga3-1.cdninstagram.com&_nc_gid=9KzCz_3heEjqarzyMVSoEg&_nc_ss=7a389&oh=00_Af3EqIte47E0VqpFJckp0CZuyiKKyFndGNhahfjxor4-nQ&oe=69DCB18A',
  },
  {
    postUrl: 'https://www.instagram.com/p/C5UOiA1xBBc/',
    alt: 'Headz Ain’t Ready — fresh cut from Instagram',
    src: 'https://scontent-lga3-2.cdninstagram.com/v/t39.30808-6/435322793_18494055376040453_3984901472218172075_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=105&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=ERYOsbXxh3wQ7kNvwG0ezZ6&_nc_oc=Adq0rHoi9jJJlSH7Qq7Akx8_g3TdokGeMWI86hhHewVNX42_crk2fY5y-nyVmPrx3Jo&_nc_zt=23&_nc_ht=scontent-lga3-2.cdninstagram.com&_nc_gid=xLVu9hFn04nIodvOcIFUrg&_nc_ss=7a389&oh=00_Af1_LnX9XxkklIr7O_b_E2u7yoPW0ZopGcfUk59AkSzO-A&oe=69DC950F',
  },
  {
    postUrl: 'https://www.instagram.com/p/ClzYHovO_wA/',
    alt: 'Headz Ain’t Ready — shop photo from Instagram',
    src: 'https://scontent-lga3-3.cdninstagram.com/v/t51.82787-15/623531199_18067739438207742_6766858103877733067_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=102&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=MGqD6Iq82owQ7kNvwFJA0GS&_nc_oc=AdrkJ2ZhNW1Er-b7WfilnZC6eTtazJVoxL8XbXRU9cN8HoGv5gNJLon7Pz3MF6SKvhI&_nc_zt=23&_nc_ht=scontent-lga3-3.cdninstagram.com&_nc_gid=-0T9izA_AzupwAan_fVDhg&_nc_ss=7a389&oh=00_Af1cK9yEJjteIul0zo9ZOd9_jZkBn5fdEPMiUgV1tngqFQ&oe=69DC9E4F',
  },
  {
    postUrl: 'https://www.instagram.com/p/ClzaV6COyWx/',
    alt: 'Headz Ain’t Ready — style from Instagram',
    src: 'https://scontent-lga3-2.cdninstagram.com/v/t51.82787-15/622613072_18141429595465181_581534236393037649_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=107&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=GmIuTODgTasQ7kNvwF5nHER&_nc_oc=AdoF1RN6gpnbarM2f_IgV4rgrkcFGqKcm3e702MBDZ2p8cAtyN3X-sd0MOJAIabjiJc&_nc_zt=23&_nc_ht=scontent-lga3-2.cdninstagram.com&_nc_gid=S-PxawjfukM_TY3SF9y9Xw&_nc_ss=7a389&oh=00_Af3GWaK0rI9tEFiNJ2ZWEZmMiPlM5ng943lPD7Qb2hHT3g&oe=69DCA5CC',
  },
  {
    postUrl: 'https://www.instagram.com/p/ClzY-cOu6sB/',
    alt: 'Headz Ain’t Ready — barbershop from Instagram',
    src: 'https://scontent-lga3-1.cdninstagram.com/v/t51.82787-15/622094966_18156497278420615_8412827492070082118_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=Z9QKZxQV_zoQ7kNvwFOqtpS&_nc_oc=Adr7dni0thunGaA0sNewSG03OA-iTQgip5ko60cVNYDIjPqyVhhjbqvn2rwZvW3ParU&_nc_zt=23&_nc_ht=scontent-lga3-1.cdninstagram.com&_nc_gid=rdTLoN6XbkSRlQ3TAuR6dQ&_nc_ss=7a389&oh=00_Af3lzE7dpzmI5uLd6w1jG0mNzsJSzGaqpamL-Jn9_nixRA&oe=69DCBA3F',
  },
  {
    postUrl: 'https://www.instagram.com/p/CEutbC5j1pw/',
    alt: 'Headz Ain’t Ready — classic cut from Instagram',
    src: 'https://scontent-lga3-1.cdninstagram.com/v/t51.82787-15/618645945_18082034309334152_4183348624368259120_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=109&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiRkVFRC5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=M9tSMNXtjSUQ7kNvwG50B7m&_nc_oc=AdoyvDAf_1HfDNMk4WdXcAYmZ8oBS9txPOu5eMvUyYbeDZM3vb1nknwlufXsGQFtq3A&_nc_zt=23&_nc_ht=scontent-lga3-1.cdninstagram.com&_nc_gid=wvaNLTvqmxDesVnhtMeI1Q&_nc_ss=7a389&oh=00_Af0-sbnQRha6YCytPlfCNVNLvRn2lvguRVNVNNHrXLpszA&oe=69DC9A64',
  },
]

export const instagramGalleryPhotos = dedupeGallery(instagramGalleryPhotosRaw)
