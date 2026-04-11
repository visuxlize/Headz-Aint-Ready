export const SQUIRE = {
  shopSlug: 'headz-aint-ready-jackson-heights-1',
  shopId: '39b8356f-26e3-4c5d-972b-b33883bbb96f',
  bookingUrl: 'https://getsquire.com/booking/book/headz-aint-ready-jackson-heights-1',
  widgetUrls: [
    'https://widget.getsquire.com/v2/headz-aint-ready-jackson-heights-1',
    'https://widget.getsquire.com/v2/?shop=headz-aint-ready-jackson-heights-1',
    'https://widget.getsquire.com/v2/?shopId=39b8356f-26e3-4c5d-972b-b33883bbb96f',
    'https://widget.getsquire.com/v2/?slug=headz-aint-ready-jackson-heights-1',
  ] as const,
  hours: {
    weekday: { open: '09:30', close: '19:00' },
    sunday: { open: '10:00', close: '18:00' },
  },
  bookingIntervalMinutes: 15,
  minAdvanceMinutes: 30,
  maxAdvanceDays: 60,
  timezone: 'America/New_York',
} as const
