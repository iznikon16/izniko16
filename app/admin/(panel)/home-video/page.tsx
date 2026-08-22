import { ExternalLink, Play, Video } from 'lucide-react';
import { saveHomeVideoAction } from '@/app/admin/(panel)/actions';
import { AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminHomeVideo } from '@/lib/admin/commerce-queries';

const defaultVideo = {
  description: 'Şasi bilginizi paylaşın; ekibimiz aracınıza uygun orijinal veya kaliteli alternatif OEM parçaları kontrol ederek net teklif için size dönüş yapsın.',
  embedUrl: 'https://www.youtube-nocookie.com/embed/o04XG-sX6hE?rel=0&modestbranding=1',
  eyebrow: 'Parça Talebi',
  is_active: true,
  title: 'Şasi numarası ile doğru yedek parça tespiti',
  video_url: 'https://youtu.be/o04XG-sX6hE',
};

function isDirectVideoUrl(value: string) {
  return /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(value.trim());
}

export default async function AdminHomeVideoPage() {
  const video = (await getAdminHomeVideo()) ?? defaultVideo;
  const isDirectVideo = isDirectVideoUrl(video.video_url);

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 border-b border-gray-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Ana Sayfa Video</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Ana Sayfa Video Ayarı</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              Anasayfadaki video bölümünün YouTube veya MP4 bağlantısını, başlığını ve yayın durumunu buradan yönetin.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
          >
            Siteyi aç
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
          <form action={saveHomeVideoAction} className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="grid gap-3">
              <input
                name="video_url"
                defaultValue={video.video_url}
                placeholder="https://youtu.be/... veya https://.../video.mp4"
                required
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-300/40"
              />
              <input
                name="eyebrow"
                defaultValue={video.eyebrow}
                placeholder="Üst etiket"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-300/40"
              />
              <input
                name="title"
                defaultValue={video.title}
                placeholder="Video başlığı"
                required
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-sky-300/40"
              />
              <textarea
                name="description"
                rows={4}
                defaultValue={video.description}
                placeholder="Video açıklaması"
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition-colors focus:border-sky-300/40"
              />
            </div>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input name="is_active" type="checkbox" defaultChecked={video.is_active} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
              Anasayfada aktif göster
            </label>

            <AdminFormPendingNotice label="Video ayarı kaydediliyor..." description="Video bağlantısı doğrulanıyor ve anasayfa yenileniyor." />

            <FormSubmitButton
              idleLabel="Video Ayarını Kaydet"
              pendingLabel="Kaydediliyor..."
              icon={<Video className="h-4 w-4" />}
              className="w-fit gap-2 px-5 text-sm font-semibold"
            />
          </form>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Önizleme</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{video.title}</h3>
              </div>
              {isDirectVideo ? <Play className="h-5 w-5 text-sky-500" /> : <Video className="h-5 w-5 text-sky-500" />}
            </div>
            <div className="overflow-hidden rounded-[18px] border border-gray-200 bg-black">
              <div className="aspect-video">
                {isDirectVideo ? (
                  <video
                    src={video.video_url}
                    title={video.title}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <iframe
                    src={video.embedUrl}
                    title={video.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="h-full w-full"
                  />
                )}
              </div>
            </div>
            <p className="mt-3 break-all text-xs leading-5 text-gray-500">{video.video_url}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

