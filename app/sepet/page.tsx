import type { Metadata } from 'next';
import { getCustomerSession } from '@/lib/commerce/queries';
import CartClient from './CartClient';

export const metadata: Metadata = {
  title: 'Sepetim | İZNİKON',
};

export default async function CartPage() {
  const session = await getCustomerSession();
  const customerDisplayName = session?.profile.full_name || session?.profile.email;

  return (
    <CartClient
      customerDisplayName={customerDisplayName}
      isAuthenticated={Boolean(session)}
    />
  );
}
