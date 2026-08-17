import Link from 'next/link';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { deleteCustomerAction, saveCustomerAction } from '@/app/admin/(panel)/actions';
import { DeleteSubmitButton } from '@/components/admin/delete-submit-button';
import { CreateCustomerModal } from '@/components/admin/create-customer-modal';
import { getAdminCustomers } from '@/lib/admin/commerce-queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { AdminCustomerFilters, AdminCustomerRecord } from '@/lib/catalog/types';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type CustomersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseBooleanFlag(value: string | string[] | undefined) {
  const normalized = getSingleParam(value).trim();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return undefined;
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): AdminCustomerFilters {
  const query = getSingleParam(searchParams.query).trim();

  return {
    blocked: parseBooleanFlag(searchParams.blocked),
    query: query || undefined,
  };
}

function CustomerRow({ customer }: { customer: AdminCustomerRecord }) {
  return (
    <details className="group border-t border-gray-100 first:border-t-0">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 outline-none transition-colors hover:bg-gray-50/50 marker:hidden lg:grid-cols-[minmax(220px,1.12fr)_minmax(210px,1fr)_150px_170px_160px_34px] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{customer.full_name || 'İsimsiz kullanıcı'}</h3>
          </div>
          <p className="mt-1 truncate text-xs text-gray-500">Güncelleme: {dateFormatter.format(new Date(customer.updated_at))}</p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-500">{customer.email}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{customer.phone || 'Telefon yok'}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">{customer.orderCount} sipariş</p>
          <p className="mt-1 text-xs text-gray-500">{formatCommercePrice(customer.totalSpent)}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500">{customer.favoriteCount} favori · {customer.cartItemCount} sepet</p>
          <p className="mt-1 text-xs text-gray-500">{customer.addressCount} adres</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={customer.is_blocked ? 'destructive' : 'success'}>
            {customer.is_blocked ? 'Bloklu' : 'Aktif'}
          </Badge>
          {customer.marketing_consent ? (
            <Badge variant="muted">
              İzinli
            </Badge>
          ) : null}
        </div>

        <ChevronDown className="hidden h-4 w-4 justify-self-end text-gray-500 transition-transform group-open:rotate-180 lg:block" />
      </summary>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
        <form action={saveCustomerAction} className="grid gap-3">
          <input type="hidden" name="user_id" value={customer.user_id} />

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.3fr)_auto] lg:items-end">
            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Ad Soyad</Label>
              <Input
                name="full_name"
                defaultValue={customer.full_name}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Telefon</Label>
              <Input
                name="phone"
                defaultValue={customer.phone}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Operasyon notu</Label>
              <Textarea
                name="admin_note"
                rows={1}
                defaultValue={customer.admin_note}
                placeholder="Müşteri segmenti, teyit notları, servis bilgisi"
              />
            </div>

            <Button type="submit" className="h-10">
              Güncelle
            </Button>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 cursor-pointer">
                <Checkbox name="is_blocked" defaultChecked={customer.is_blocked} />
                Alışveriş kilidi
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              Son sipariş: {customer.lastOrderAt ? dateFormatter.format(new Date(customer.lastOrderAt)) : 'Henüz sipariş yok'}
            </p>
          </div>
        </form>

        <div className="mt-4 flex flex-col gap-3 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-600">Kalıcı Silme</p>
            <p className="mt-1 text-xs leading-5 text-red-700/80">Müşteri hesabı ve bağlı kayıtlar sistemden kaldırılır.</p>
          </div>
          <form action={deleteCustomerAction}>
            <input type="hidden" name="user_id" value={customer.user_id} />
            <DeleteSubmitButton
              confirmMessage={`${customer.email || customer.full_name || 'Bu müşteri'} kalıcı olarak silinsin mi? Bağlı adres, sepet, favori ve sipariş kayıtları da kaldırılır.`}
              label="Müşteriyi Sil"
            />
          </form>
        </div>
      </div>
    </details>
  );
}

function CustomerTable({ customers }: { customers: AdminCustomerRecord[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
      <div className="hidden border-b border-gray-200 bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 lg:grid lg:grid-cols-[minmax(220px,1.12fr)_minmax(210px,1fr)_150px_170px_160px_34px]">
        <span>Kullanıcı</span>
        <span>İletişim</span>
        <span>Sipariş</span>
        <span>Aktivite</span>
        <span>Durum</span>
        <span />
      </div>
      {customers.map((customer) => (
        <CustomerRow key={customer.user_id} customer={customer} />
      ))}
    </div>
  );
}

export default async function AdminCustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const customers = await getAdminCustomers(filters);
  const activeFilterCount = [filters.query, filters.blocked].filter((value) => value !== undefined && value !== '').length;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    typeof filters.blocked === 'boolean' ? `Blok: ${filters.blocked ? 'Aktif' : 'Kapalı'}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Kullanıcılar</p>
            <CardTitle className="mt-3">Müşteri yönetimi</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Profil bilgilerini ve alışveriş kilidini buradan yönetin. Pazarlama izni kullanıcı tarafından hesap ayarlarından değiştirilir.
            </CardDescription>
          </div>
          <CreateCustomerModal />
        </CardHeader>

        <CardContent>
        <form className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                name="query"
                defaultValue={filters.query ?? ''}
                placeholder="Ad, e-posta veya telefon ara"
                className="pl-11"
              />
            </div>

            <Select name="blocked" defaultValue={typeof filters.blocked === 'boolean' ? String(filters.blocked) : ''}>
              <option value="">Tüm hesap durumları</option>
              <option value="true">Bloklu hesaplar</option>
              <option value="false">Aktif hesaplar</option>
            </Select>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Müşteri Havuzu</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{customers.length} kayıt</p>
              {activeFilterLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <Badge key={label} variant="muted">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrele
              </Button>
              {activeFilterCount > 0 ? (
                <Link
                  href="/admin/customers"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                >
                  <X className="h-4 w-4" />
                  Temizle
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        {customers.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Müşteri bulunamadı"
            description="Bu filtrelerle eşleşen müşteri kaydı bulunmamaktadır."
          />
        ) : (
          <CustomerTable customers={customers} />
        )}
        </CardContent>
      </Card>
    </div>
  );
}
