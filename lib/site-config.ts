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

/** Price list for display on marketing site (matches booking options) */
export const PRICE_LIST = [
  { name: 'Kids Haircut', price: '$30.00', duration: '30 min' },
  { name: 'Shape Up', price: '$20.00', duration: '30 min' },
  { name: 'Shape Up & Beard', price: '$30.00', duration: '30 min' },
  { name: 'Senior Citizens', price: '$30.00', duration: '30 min' },
  { name: 'Haircut Adult', price: '$40.00', duration: '30 min' },
  { name: 'Haircut & Beard', price: '$50.00', duration: '30 min' },
  { name: 'Haircut / Beard / Hot Towel', price: '$55.00', duration: '30 min' },
  { name: 'Enhancement beard color black/brown', price: 'Price varies', duration: '30 min' },
  { name: 'Braids', price: '$50.00', duration: '30 min' },
] as const
