import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

type CartButtonProps = {
  onClick?: () => void;
};

export function CartButton({ onClick }: CartButtonProps) {
  const { data: cart } = useCart();

  const itemCount = cart?.items_count || 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
      aria-label="Open cart"
    >
      <ShoppingCart className="h-6 w-6" />

      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1 text-xs font-bold text-white">
          {itemCount}
        </span>
      )}
    </button>
  );
}
