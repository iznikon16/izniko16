import type { Metadata } from 'next';
import { getCustomerSession } from '@/lib/commerce/queries';
import WholesaleApplicationClient from './WholesaleApplicationClient';

export const metadata: Metadata = {
  title: 'Toptan Müşteri Ol | İZNİKON',
};

export default async function WholesaleApplicationPage() {
  const session = await getCustomerSession();
  return <WholesaleApplicationClient isAuthenticated={Boolean(session)} />;
}
