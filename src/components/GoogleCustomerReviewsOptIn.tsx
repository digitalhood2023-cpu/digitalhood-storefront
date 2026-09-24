import { useEffect } from 'react'

const GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID = 5857752325
const GOOGLE_CUSTOMER_REVIEWS_SCRIPT_ID =
  'google-customer-reviews-platform'

const pendingOrders = new Set<string>()
const renderedOrders = new Set<string>()

type SurveyOptInStyle =
  | 'CENTER_DIALOG'
  | 'BOTTOM_RIGHT_DIALOG'
  | 'BOTTOM_LEFT_DIALOG'
  | 'TOP_RIGHT_DIALOG'
  | 'TOP_LEFT_DIALOG'
  | 'BOTTOM_TRAY'

type SurveyOptInConfig = {
  merchant_id: number
  order_id: string
  email: string
  delivery_country: string
  estimated_delivery_date: string
  opt_in_style?: SurveyOptInStyle
}

type GoogleApi = {
  load: (name: string, callback: () => void) => void
  surveyoptin?: {
    render: (config: SurveyOptInConfig) => void
  }
}

declare global {
  interface Window {
    gapi?: GoogleApi
    renderOptIn?: () => void
    ___gcfg?: {
      lang?: string
    }
  }
}

type GoogleCustomerReviewsOptInProps = {
  orderId: string | number
  email: string
  deliveryCountry: string
  estimatedDeliveryDate: string
}

export default function GoogleCustomerReviewsOptIn({
  orderId,
  email,
  deliveryCountry,
  estimatedDeliveryDate,
}: GoogleCustomerReviewsOptInProps) {
  useEffect(() => {
    const normalizedOrderId = String(orderId || '').trim()
    const normalizedEmail = String(email || '').trim()

    if (
      !normalizedOrderId ||
      !normalizedEmail ||
      !deliveryCountry ||
      !estimatedDeliveryDate
    ) {
      return
    }

    let active = true

    const renderOptIn = () => {
      if (
        !active ||
        renderedOrders.has(normalizedOrderId) ||
        pendingOrders.has(normalizedOrderId)
      ) {
        return
      }

      const gapi = window.gapi

      if (!gapi) return

      pendingOrders.add(normalizedOrderId)

      try {
        gapi.load('surveyoptin', () => {
          try {
            if (!active || renderedOrders.has(normalizedOrderId)) {
              return
            }

            const surveyOptIn = window.gapi?.surveyoptin

            if (!surveyOptIn) {
              console.warn(
                'Google Customer Reviews surveyoptin API was not available.'
              )
              return
            }

            surveyOptIn.render({
              merchant_id: GOOGLE_CUSTOMER_REVIEWS_MERCHANT_ID,
              order_id: normalizedOrderId,
              email: normalizedEmail,
              delivery_country: deliveryCountry,
              estimated_delivery_date: estimatedDeliveryDate,
              opt_in_style: 'CENTER_DIALOG',
            })

            renderedOrders.add(normalizedOrderId)
          } finally {
            pendingOrders.delete(normalizedOrderId)
          }
        })
      } catch (error) {
        pendingOrders.delete(normalizedOrderId)
        console.error('Google Customer Reviews opt-in failed to load.', error)
      }
    }

    window.___gcfg = {
      ...window.___gcfg,
      lang: 'en',
    }

    window.renderOptIn = renderOptIn

    if (window.gapi) {
      renderOptIn()
    } else if (!document.getElementById(GOOGLE_CUSTOMER_REVIEWS_SCRIPT_ID)) {
      const script = document.createElement('script')

      script.id = GOOGLE_CUSTOMER_REVIEWS_SCRIPT_ID
      script.src =
        'https://apis.google.com/js/platform.js?onload=renderOptIn'
      script.async = true
      script.defer = true

      document.body.appendChild(script)
    }

    return () => {
      active = false
      pendingOrders.delete(normalizedOrderId)
    }
  }, [deliveryCountry, email, estimatedDeliveryDate, orderId])

  return null
}
