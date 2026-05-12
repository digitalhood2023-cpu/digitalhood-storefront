import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '@/hooks/useCart';

type CartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { data: cart, isLoading, error } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">Your Cart</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          {isLoading && <p>Loading cart...</p>}

          {error && <p className="text-red-600">Could not load cart.</p>}

          {!isLoading && cart?.items?.length === 0 && (
            <p className="text-gray-600">Your cart is empty.</p>
          )}

          <div className="space-y-4">
            {cart?.items?.map((item) => (
              <div key={item.key} className="flex gap-3 border-b pb-4">
                {item.images?.[0]?.src && (
                  <img
                    src={item.images[0].src}
                    alt={item.images[0].alt || item.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                )}

                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  <p className="mt-1 font-semibold">
                    {item.prices?.currency_symbol}
                    {Number(item.prices?.price || 0) / 100}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {cart && cart.items.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
            <Link
              to="/cart"
              onClick={onClose}
              className="block w-full rounded-lg border border-black py-3 text-center font-semibold"
            >
              View Cart
            </Link>

            <Link
              to="/checkout"
              onClick={onClose}
              className="mt-3 block w-full rounded-lg bg-black py-3 text-center font-semibold text-white"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
