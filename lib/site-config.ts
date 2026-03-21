/**
 * Site content extracted from headzaintready.com
 * Single source for hours, contact, social, and pricing display.
 */

export const SITE = {
  name: "Headz Ain't Ready",
  tagline: 'Barbershop · Queens, NYC',
  address: '81-13 37th Ave, Jackson Heights',
  addressUrl: 'https://goo.gl/maps/V4LMsANaVuYTuSQF9',
  phone: '(718) 429-6841',
  phoneTel: '+17184296841',
  email: 'info@headzaintready.com',
  hours: 'Monday – Sunday 9am – 8pm',
  hoursShort: 'Mon – Sun 9am – 8pm',
  /** Store operation hours for booking (EST). 9 = 9am, 20 = 8pm close. */
  bookingOpenHour: 9,
  bookingCloseHour: 20,
  social: {
    facebook: 'https://www.facebook.com/headzaintreadybarbershop',
    instagram: 'https://www.instagram.com/headzaintready.nyc',
  },
} as const

/**
 * Home /book pricing comes from the `services` table (Dashboard → Services & pricing).
 * Default rows match Feb 2026 marketing: `lib/services/default-headz-services.json` — run `npm run restore:services` to sync DB.
 */
