type StockTone = 'success' | 'warning' | 'danger' | 'muted';

type StockBadgeItem = {
  stock_label?: string;
  stockLabel?: string;
  stock_tone?: StockTone | string;
  stockTone?: StockTone | string;
  can_add_to_cart?: boolean;
  canAddToCart?: boolean;
  purchasable?: boolean;
  stock_status?: string;
  stockStatus?: string;
  manage_stock?: boolean;
  manageStock?: boolean;
  stock_quantity?: number | null;
  stockQuantity?: number | null;
  inStock?: boolean;
};

type StockBadgeProps = {
  item?: StockBadgeItem | null;
  className?: string;
};

function normalizeTone(tone?: string): StockTone {
  if (
    tone === 'success' ||
    tone === 'warning' ||
    tone === 'danger' ||
    tone === 'muted'
  ) {
    return tone;
  }

  return 'muted';
}

function getStockStatus(item: StockBadgeItem): string {
  return (
    item.stock_status ||
    item.stockStatus ||
    (item.inStock === false ? 'outofstock' : 'instock')
  );
}

function getStockQuantity(item: StockBadgeItem): number | null {
  const value = item.stock_quantity ?? item.stockQuantity;

  if (value === null || value === undefined) {
    return null;
  }

  const quantity = Number(value);

  return Number.isNaN(quantity) ? null : quantity;
}

function getManageStock(item: StockBadgeItem): boolean {
  return Boolean(item.manage_stock ?? item.manageStock ?? false);
}

function getStockBadge(item?: StockBadgeItem | null) {
  if (!item) {
    return {
      label: 'Unavailable',
      tone: 'muted' as StockTone,
      canAddToCart: false,
    };
  }

  if (item.can_add_to_cart === false || item.canAddToCart === false) {
    return {
      label: item.stock_label || item.stockLabel || 'Unavailable',
      tone: normalizeTone(item.stock_tone || item.stockTone),
      canAddToCart: false,
    };
  }

  if (item.stock_label || item.stockLabel) {
    return {
      label: item.stock_label || item.stockLabel || 'In stock',
      tone: normalizeTone(item.stock_tone || item.stockTone),
      canAddToCart: item.can_add_to_cart ?? item.canAddToCart ?? true,
    };
  }

  if (item.purchasable === false) {
    return {
      label: 'Unavailable',
      tone: 'muted' as StockTone,
      canAddToCart: false,
    };
  }

  const stockStatus = getStockStatus(item);
  const stockQuantity = getStockQuantity(item);
  const manageStock = getManageStock(item);

  if (stockStatus === 'outofstock') {
    return {
      label: 'Out of stock',
      tone: 'danger' as StockTone,
      canAddToCart: false,
    };
  }

  if (stockStatus === 'onbackorder') {
    return {
      label: 'Available on backorder',
      tone: 'warning' as StockTone,
      canAddToCart: true,
    };
  }

  if (manageStock && stockQuantity !== null) {
    if (stockQuantity <= 0) {
      return {
        label: 'Out of stock',
        tone: 'danger' as StockTone,
        canAddToCart: false,
      };
    }

    if (stockQuantity <= 3) {
      return {
        label: `Almost sold out - ${stockQuantity} left`,
        tone: 'warning' as StockTone,
        canAddToCart: true,
      };
    }

    if (stockQuantity <= 10) {
      return {
        label: `Only ${stockQuantity} left`,
        tone: 'warning' as StockTone,
        canAddToCart: true,
      };
    }
  }

  return {
    label: 'In stock',
    tone: 'success' as StockTone,
    canAddToCart: true,
  };
}

export default function StockBadge({ item, className = '' }: StockBadgeProps) {
  const badge = getStockBadge(item);

  const toneClasses: Record<StockTone, string> = {
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    muted: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        toneClasses[badge.tone]
      } ${className}`}
    >
      {badge.label}
    </span>
  );
}
