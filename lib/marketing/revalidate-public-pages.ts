import { revalidatePath } from 'next/cache'

/** Public routes that show live service name/price/description from the admin catalog. */
export function revalidateMarketingAndBooking() {
  revalidatePath('/', 'page')
  revalidatePath('/book', 'page')
}
