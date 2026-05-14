export async function markWooCommerceOrderPaid(orderId: string) {
  const response = await fetch(`/api/woocommerce/orders/${orderId}/mark-paid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Could not mark order as paid');
  }

  return data;
}
