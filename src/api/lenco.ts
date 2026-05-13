export type LencoMobileMoneyPayload = {
  amount: number;
  phone: string;
  operator: 'mtn' | 'airtel';
  reference: string;
};

export async function initiateLencoMobileMoney(payload: LencoMobileMoneyPayload) {
  const response = await fetch('/api/lenco/mobile-money', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Mobile money payment failed');
  }

  return data;
}

export function detectMobileMoneyOperator(phone: string): 'mtn' | 'airtel' {
  const cleaned = phone.replace(/\D/g, '');

  if (
    cleaned.startsWith('26096') ||
    cleaned.startsWith('26076') ||
    cleaned.startsWith('096') ||
    cleaned.startsWith('076')
  ) {
    return 'mtn';
  }

  if (
    cleaned.startsWith('26097') ||
    cleaned.startsWith('26077') ||
    cleaned.startsWith('097') ||
    cleaned.startsWith('077')
  ) {
    return 'airtel';
  }

  return 'mtn';
}
