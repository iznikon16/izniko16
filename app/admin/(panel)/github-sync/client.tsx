'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Cloud, UploadCloud, RefreshCw, KeyRound } from 'lucide-react';
import { saveGitHubConfig, testGitHubConnection, pushToGitHub } from './actions';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface GitHubSyncProps {
  config: Record<string, any> | null;
  gitStatus: Record<string, any> | null;
  lastCommit: Record<string, any> | null;
  logs: Record<string, any>[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function GitHubSyncClient({ config, gitStatus, lastCommit, logs }: GitHubSyncProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await saveGitHubConfig(formData);
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Ayarlar başarıyla kaydedildi.');
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    const res = await testGitHubConnection();
    setLoading(false);
    if (res.error) {
      alert('Bağlantı hatası: ' + res.error);
    } else {
      alert('Bağlantı başarılı!');
    }
  };

  const handlePush = async () => {
    if (!confirm('Değişiklikleri GitHub\'a göndermek istediğinize emin misiniz?')) return;
    setLoading(true);
    const res = await pushToGitHub(message);
    setLoading(false);
    if (res.error) {
      alert('Hata: ' + res.error);
    } else {
      alert(res.message);
      setMessage('');
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            GitHub Bağlantı Ayarları
          </CardTitle>
          <CardDescription>
            Repository bilgilerinizi ve Access Token&apos;ınızı girin. Token güvenli şekilde şifrelenir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Organizasyon / Kullanıcı Adı</label>
              <Input name="owner" defaultValue={config?.github_owner || ''} required placeholder="Örn: cyclonies" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Repository Adı</label>
              <Input name="repository" defaultValue={config?.github_repository || ''} required placeholder="Örn: b2b-panel" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Branch</label>
              <Input name="branch" defaultValue={config?.github_branch || 'main'} required />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                Personal Access Token
              </label>
              <Input type="password" name="token" placeholder={config ? '••••••••••••••••' : 'ghp_...'} required={!config} />
              <p className="text-xs text-gray-500">Token yalnızca sunucu tarafında kullanılır ve arayüzde açık olarak görüntülenmez.</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button type="submit" disabled={loading}>
                Ayarları Kaydet
              </Button>
              <Button type="button" variant="outline" onClick={handleTestConnection} disabled={loading || !config}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Bağlantıyı Test Et
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Senkronizasyon Durumu</CardTitle>
          <CardDescription>Yerel kodunuz ile GitHub arasındaki durumu takip edin.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {config ? (
            <>
              <div className="grid gap-3">
                <div className="flex justify-between items-center rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Remote</p>
                    <p className="font-medium">github.com/{config.github_owner}/{config.github_repository}</p>
                  </div>
                  <Badge variant={gitStatus?.hasLocalChanges ? 'warning' : 'success'}>
                    {gitStatus?.hasLocalChanges ? 'Yerel değişiklik var' : 'Senkronize'}
                  </Badge>
                </div>
                
                {lastCommit && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Son Commit</p>
                    <div className="mt-1">
                      <p className="font-medium text-sm">{lastCommit.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{lastCommit.shortSha} · {lastCommit.author} · {new Date(lastCommit.date).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 border-t border-gray-100 pt-6">
                <h3 className="font-semibold text-sm">GitHub&apos;a Yedekle</h3>
                <Input 
                  placeholder="Opsiyonel commit mesajı... Örn: Cari modülü güncellendi" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                />
                <Button onClick={handlePush} disabled={loading} className="w-full sm:w-auto">
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Yedekle ve Gönder
                </Button>
              </div>
            </>
          ) : (
            <EmptyState title="Yapılandırma Bekleniyor" description="İşlem yapabilmek için sol taraftan GitHub bağlantı ayarlarını kaydedin." />
          )}
        </CardContent>
      </Card>

      {/* Logs Card */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
          <CardDescription>Son yapılan senkronizasyon işlemleri</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">İşlem</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 rounded-r-lg">Mesaj / Detay</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">Kayıt bulunamadı.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium">{log.operation_type}</td>
                      <td className="px-4 py-3 text-gray-500">{new Date(log.started_at).toLocaleString('tr-TR')}</td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'destructive' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.message || log.error_message_safe || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
