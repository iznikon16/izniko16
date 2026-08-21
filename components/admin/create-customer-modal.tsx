'use client';

import { useState, useRef } from 'react';
import { UserPlus, X, Mail, Lock, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createCustomerAction } from '@/app/admin/(panel)/actions';

export function CreateCustomerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    try {
      await createCustomerAction(formData);
      toast.success('Müşteri başarıyla oluşturuldu');
      setIsOpen(false);
      formRef.current?.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bir hata oluştu');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2 rounded-full font-semibold shadow-sm hover:shadow-md transition-all"
      >
        <UserPlus className="h-4 w-4" />
        Yeni Kullanıcı
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4">
            <div className="flex flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Yeni Kullanıcı Ekle</h2>
                </div>
                <button
                  onClick={() => !isPending && setIsOpen(false)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                  disabled={isPending}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <form ref={formRef} action={handleSubmit} className="flex flex-col p-6">
                <div className="grid gap-4">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      name="email"
                      type="email"
                      placeholder="E-posta adresi"
                      required
                      className="pl-11 rounded-xl h-12"
                      disabled={isPending}
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      name="password"
                      type="password"
                      placeholder="Şifre (En az 8 karakter)"
                      required
                      minLength={8}
                      className="pl-11 rounded-xl h-12"
                      disabled={isPending}
                    />
                  </div>

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      name="full_name"
                      type="text"
                      placeholder="Ad Soyad"
                      className="pl-11 rounded-xl h-12"
                      disabled={isPending}
                    />
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="Telefon Numarası"
                      className="pl-11 rounded-xl h-12"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-full"
                    disabled={isPending}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 rounded-full"
                    disabled={isPending}
                  >
                    {isPending ? 'Ekleniyor...' : 'Kullanıcıyı Kaydet'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
