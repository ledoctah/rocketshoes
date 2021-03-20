import { createContext, ReactNode, useContext, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (!stock) {
        throw new Error('Stock not found.');
      }

      const found = cart.find(item => item.id === productId);

      let newCart: Product[] = [];

      if (found) {
        if (stock.amount < found.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');

          return;
        }

        updateProductAmount({
          productId,
          amount: found.amount + 1,
        });

        return;
      }

      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const { data: product } = await api.get<Product>(
        `/products/${productId}`,
      );

      if (!product) {
        throw new Error('Product not found.');
      }

      newCart = [...cart, { ...product, amount: 1 }];

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const found = cart.find(product => product.id === productId);

      if (!found) {
        throw new Error('Product not found');
      }

      const newCart = cart.filter(product => product.id !== productId);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch (e) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const found = cart.find(product => product.id === productId);

      if (!found) {
        throw new Error('Product not found');
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (!stock) {
        throw new Error('Stock not found.');
      }

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      const newCart = cart.map(product => {
        const updatedProduct = product;

        if (updatedProduct.id === productId) {
          updatedProduct.amount = amount;
        }

        return updatedProduct;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
