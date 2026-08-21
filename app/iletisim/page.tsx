import type { Metadata } from 'next';
import { getCustomerSession } from '@/lib/commerce/queries';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'İletişim ve Destek | İZNİKON',
};

export default async function ContactPage() {
  const session = await getCustomerSession();
  return <ContactClient isAuthenticated={Boolean(session)} />;
}
