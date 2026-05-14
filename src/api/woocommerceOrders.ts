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

export async function applyWooCommerceOrderShipping({
  orderId,
  shippingFee,
  shippingTitle,
}: {
  orderId: string;
  shippingFee: number;
  shippingTitle: string;
}) {
  const response = await fetch(
    `/api/woocommerce/orders/${orderId}/apply-shipping`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shippingFee,
        shippingTitle,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Could not apply shipping to order');
  }

  return data;
}