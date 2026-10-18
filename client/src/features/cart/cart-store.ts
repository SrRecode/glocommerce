import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Client-side cart. Prices are stored for display only — the server always
 * recomputes line totals, shipping, and stock on checkout.
 *
 * `maxStock` is captured when the item is added so the UI can clamp the stepper
 * without a refetch; the server remains the source of truth at checkout.
 */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number;
  currency: string;
  quantity: number;
  maxStock: number;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

const MAX_QUANTITY = 99;

export function clampQuantity(quantity: number, maxStock: number): number {
  const upper = maxStock > 0 ? Math.min(maxStock, MAX_QUANTITY) : MAX_QUANTITY;
  const safeQuantity = Number.isFinite(quantity) ? Math.round(quantity) : 1;
  return Math.max(1, Math.min(upper, safeQuantity));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((entry) => entry.productId === item.productId);
          if (!existing) {
            return {
              items: [...state.items, { ...item, quantity: clampQuantity(quantity, item.maxStock) }],
            };
          }
          return {
            items: state.items.map((entry) =>
              entry.productId === item.productId
                ? {
                    ...entry,
                    ...item,
                    quantity: clampQuantity(entry.quantity + quantity, item.maxStock),
                  }
                : entry,
            ),
          };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((entry) => entry.productId !== productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((entry) =>
            entry.productId === productId
              ? { ...entry, quantity: clampQuantity(quantity, entry.maxStock) }
              : entry,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'glocommerce-cart',
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function selectTotalItems(state: CartState): number {
  return state.items.reduce((total, item) => total + item.quantity, 0);
}

export function selectSubtotal(state: CartState): number {
  return state.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

export function selectCurrency(state: CartState): string {
  const [first] = state.items;
  return first ? first.currency : 'PKR';
}
