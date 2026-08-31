import type { FeedbackEligibility } from '@/api/feedback'

export type OrderFeedbackProgress = {
  total: number
  pending: number
  submitted: number
  unavailable: number
  reviewedOrderItemIds: Set<number>
}

export function isSubmittedFeedback(eligibility: FeedbackEligibility) {
  return eligibility.status === 'submitted' || Boolean(eligibility.submittedFeedbackId)
}

export function getOrderFeedbackProgress(
  eligibilities: FeedbackEligibility[],
  orderId: string | number
): OrderFeedbackProgress {
  const matching = eligibilities.filter(
    (eligibility) => String(eligibility.orderId) === String(orderId)
  )
  const reviewedOrderItemIds = new Set<number>()

  matching.forEach((eligibility) => {
    if (
      eligibility.targetType === 'product' &&
      eligibility.orderItemId &&
      isSubmittedFeedback(eligibility)
    ) {
      reviewedOrderItemIds.add(Number(eligibility.orderItemId))
    }
  })

  return {
    total: matching.length,
    pending: matching.filter((eligibility) => eligibility.status === 'eligible').length,
    submitted: matching.filter(isSubmittedFeedback).length,
    unavailable: matching.filter((eligibility) =>
      eligibility.status === 'expired' || eligibility.status === 'revoked'
    ).length,
    reviewedOrderItemIds,
  }
}
