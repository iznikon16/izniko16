import { requireAdminSession } from '@/lib/auth/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function PlaceholderPage() {
  await requireAdminSession();
  
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Yapım Aşamasında</h1>
        <p className="mt-1 text-gray-500">Bu modül henüz geliştirilme aşamasındadır.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Çok Yakında</CardTitle>
          <CardDescription>
            Bu sayfanın altyapı ve arayüz çalışmaları devam etmektedir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
            <span className="text-sm font-medium text-gray-500">Modül içeriği buraya eklenecektir</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
