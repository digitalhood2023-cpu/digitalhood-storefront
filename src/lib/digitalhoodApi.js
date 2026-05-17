import { getAccountToken } from "@/api/account";

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || "https://payments.digitalhood.info";

async function parseJsonResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(
      `Server returned non-JSON response. Status: ${response.status}. Response started with: ${text.slice(
        0,
        80
      )}`
    );
  }

  if (!response.ok) {
    const message =
      data?.details ||
      data?.error ||
      data?.message ||
      `Request failed with ${response.status}`;

    const customError = new Error(message);
    customError.status = response.status;
    customError.data = data;

    throw customError;
  }

  return data;
}

function getAuthHeaders() {
  const accountToken = getAccountToken();

  return {
    "Content-Type": "application/json",
    ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
  };
}

export async function getProducts(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  });

  const response = await fetch(`${PAYMENTS_API_URL}/api/products?${query.toString()}`);

  return parseJsonResponse(response);
}

export async function getProduct(productId) {
  const response = await fetch(`${PAYMENTS_API_URL}/api/products/${productId}`);

  return parseJsonResponse(response);
}

export async function getProductVariations(productId) {
  const response = await fetch(`${PAYMENTS_API_URL}/api/products/${productId}/variations`);

  return parseJsonResponse(response);
}

export async function createWooCommerceOrder(payload) {
  const response = await fetch(`${PAYMENTS_API_URL}/api/create-order`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}

export async function createStripePaymentIntent(payload) {
  const response = await fetch(`${PAYMENTS_API_URL}/create-payment-intent`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  return parseJsonResponse(response);
}

export async function verifyStripePayment(paymentIntentId) {
  const response = await fetch(`${PAYMENTS_API_URL}/verify-stripe-payment`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ paymentIntentId }),
  });

  return parseJsonResponse(response);
}