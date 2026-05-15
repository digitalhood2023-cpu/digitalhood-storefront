export function getStockBadge(productOrVariation) {
  if (!productOrVariation) {
    return {
      label: "Unavailable",
      tone: "muted",
      canAddToCart: false,
    };
  }

  if (productOrVariation.can_add_to_cart === false) {
    return {
      label: productOrVariation.stock_label || "Unavailable",
      tone: productOrVariation.stock_tone || "muted",
      canAddToCart: false,
    };
  }

  if (productOrVariation.stock_label) {
    return {
      label: productOrVariation.stock_label,
      tone: productOrVariation.stock_tone || "success",
      canAddToCart: productOrVariation.can_add_to_cart !== false,
    };
  }

  if (productOrVariation.stock_status === "outofstock") {
    return {
      label: "Out of stock",
      tone: "danger",
      canAddToCart: false,
    };
  }

  if (productOrVariation.stock_status === "onbackorder") {
    return {
      label: "Available on backorder",
      tone: "warning",
      canAddToCart: true,
    };
  }

  if (
    productOrVariation.manage_stock &&
    productOrVariation.stock_quantity !== null &&
    productOrVariation.stock_quantity !== undefined
  ) {
    const qty = Number(productOrVariation.stock_quantity);

    if (qty <= 0) {
      return {
        label: "Out of stock",
        tone: "danger",
        canAddToCart: false,
      };
    }

    if (qty <= 3) {
      return {
        label: `Almost sold out - ${qty} left`,
        tone: "warning",
        canAddToCart: true,
      };
    }

    if (qty <= 10) {
      return {
        label: `Only ${qty} left`,
        tone: "warning",
        canAddToCart: true,
      };
    }
  }

  return {
    label: "In stock",
    tone: "success",
    canAddToCart: true,
  };
}

export function canAddProductToCart(product, selectedVariation = null) {
  if (!product) return false;

  if (product.type === "variable") {
    if (!selectedVariation) return false;
    return getStockBadge(selectedVariation).canAddToCart;
  }

  return getStockBadge(product).canAddToCart;
}

export function getProductSoldText(product) {
  const totalSales = Number(product?.total_sales || 0);

  if (totalSales <= 0) return "";

  if (totalSales === 1) return "1 sold";

  return `${totalSales.toLocaleString()} sold`;
}

export function getProductRatingText(product) {
  const rating = Number(product?.average_rating || 0);
  const count = Number(product?.rating_count || product?.review_count || 0);

  if (!rating || !count) {
    return "No verified ratings yet";
  }

  return `${rating.toFixed(1)} ★ · ${count} verified ${
    count === 1 ? "rating" : "ratings"
  }`;
}
