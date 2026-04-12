import toast from 'react-hot-toast'
import { publicMessageForFailedResponse, publicMessageFromUnknown } from '@/lib/errors/public-message'

export function toastApiError(res: Response) {
  toast.error(publicMessageForFailedResponse(res))
}

export function toastUnexpected(err: unknown) {
  toast.error(publicMessageFromUnknown(err))
}
