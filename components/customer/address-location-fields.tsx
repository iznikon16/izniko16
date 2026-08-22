'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

type LocationItem = { id: number; name: string; postalCode?: string };
type IstanbulSide = '' | 'Anadolu Yakası' | 'Avrupa Yakası';

const EUROPEAN_DISTRICTS = new Set([
  'Arnavutköy', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beylikdüzü',
  'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören',
  'Kağıthane', 'Küçükçekmece', 'Sarıyer', 'Silivri', 'Sultangazi', 'Şişli', 'Zeytinburnu',
]);

const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-wait disabled:bg-slate-50 disabled:text-slate-400';

function getIstanbulSide(districtName: string): IstanbulSide {
  if (!districtName) return '';
  return EUROPEAN_DISTRICTS.has(districtName) ? 'Avrupa Yakası' : 'Anadolu Yakası';
}

async function loadItems(resource: 'provinces' | 'districts' | 'neighborhoods', parentId?: number) {
  const query = new URLSearchParams({ resource });
  if (parentId) query.set('parentId', String(parentId));
  const response = await fetch(`/api/address-data?${query}`, { headers: { Accept: 'application/json' } });
  const payload = await response.json() as { error?: string; items?: LocationItem[] };
  if (!response.ok) throw new Error(payload.error || 'Adres verileri alınamadı.');
  return payload.items ?? [];
}

export function AddressLocationFields({
  defaultCity = 'İstanbul',
  defaultDistrict = '',
  defaultNeighborhood = '',
  defaultPostalCode = '',
}: {
  defaultCity?: string;
  defaultDistrict?: string;
  defaultNeighborhood?: string;
  defaultPostalCode?: string;
}) {
  const [provinces, setProvinces] = useState<LocationItem[]>([]);
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationItem[]>([]);
  const [provinceId, setProvinceId] = useState(0);
  const [districtId, setDistrictId] = useState(0);
  const [neighborhoodId, setNeighborhoodId] = useState(0);
  const [istanbulSide, setIstanbulSide] = useState<IstanbulSide>('');
  const [postalCode, setPostalCode] = useState(defaultPostalCode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedProvince = provinces.find((item) => item.id === provinceId);
  const selectedDistrict = districts.find((item) => item.id === districtId);
  const selectedNeighborhood = neighborhoods.find((item) => item.id === neighborhoodId);
  const isIstanbul = selectedProvince?.name === 'İstanbul';
  const visibleDistricts = useMemo(() => !isIstanbul || !istanbulSide
    ? districts
    : districts.filter((item) => getIstanbulSide(item.name) === istanbulSide), [districts, isIstanbul, istanbulSide]);

  useEffect(() => {
    let active = true;
    loadItems('provinces').then((items) => {
      if (!active) return;
      setProvinces(items);
      setProvinceId(items.find((item) => item.name === defaultCity)?.id ?? items.find((item) => item.name === 'İstanbul')?.id ?? items[0]?.id ?? 0);
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Adres verileri alınamadı.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [defaultCity]);

  useEffect(() => {
    if (!provinceId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prevent stale district submission while the selected province is loading
    setLoading(true);
    setError('');
    setDistricts([]);
    setNeighborhoods([]);
    setDistrictId(0);
    setNeighborhoodId(0);
    loadItems('districts', provinceId).then((items) => {
      if (!active) return;
      setDistricts(items);
      const initial = items.find((item) => item.name === defaultDistrict);
      if (initial) {
        setDistrictId(initial.id);
        if (provinceId === 34) setIstanbulSide(getIstanbulSide(initial.name));
      } else if (provinceId !== 34) {
        setIstanbulSide('');
      }
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'İlçe verileri alınamadı.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [defaultDistrict, provinceId]);

  useEffect(() => {
    if (!districtId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prevent stale neighborhood submission while the selected district is loading
    setLoading(true);
    setNeighborhoods([]);
    setNeighborhoodId(0);
    loadItems('neighborhoods', districtId).then((items) => {
      if (!active) return;
      setNeighborhoods(items);
      const initial = items.find((item) => item.name === defaultNeighborhood);
      if (initial) {
        setNeighborhoodId(initial.id);
        setPostalCode(initial.postalCode || defaultPostalCode);
      }
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Mahalle verileri alınamadı.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [defaultNeighborhood, defaultPostalCode, districtId]);

  return (
    <>
      <input type="hidden" name="city" value={selectedProvince?.name ?? ''} />
      <input type="hidden" name="district" value={selectedDistrict?.name ?? ''} />
      <input type="hidden" name="neighborhood" value={selectedNeighborhood?.name ?? ''} />
      <input type="hidden" name="istanbul_side" value={isIstanbul ? istanbulSide : ''} />
      <label className="text-sm font-bold text-slate-700">İl <span className="text-red-500">*</span>
        <select value={provinceId} required disabled={loading && provinces.length === 0} onChange={(event) => setProvinceId(Number(event.target.value))} className={inputClass}>
          <option value={0}>İl seçin</option>
          {provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {isIstanbul ? <label className="text-sm font-bold text-slate-700">Yaka <span className="text-red-500">*</span>
        <select value={istanbulSide} required onChange={(event) => { setIstanbulSide(event.target.value as IstanbulSide); setDistrictId(0); setNeighborhoodId(0); }} className={inputClass}>
          <option value="">Yaka seçin</option><option value="Avrupa Yakası">Avrupa Yakası</option><option value="Anadolu Yakası">Anadolu Yakası</option>
        </select>
      </label> : null}
      <label className="text-sm font-bold text-slate-700">İlçe <span className="text-red-500">*</span>
        <select value={districtId} required disabled={!provinceId || (isIstanbul && !istanbulSide) || loading} onChange={(event) => setDistrictId(Number(event.target.value))} className={inputClass}>
          <option value={0}>İlçe seçin</option>
          {visibleDistricts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-slate-700">Mahalle <span className="text-red-500">*</span>
        <select value={neighborhoodId} required disabled={!districtId || loading} onChange={(event) => { const id = Number(event.target.value); setNeighborhoodId(id); setPostalCode(neighborhoods.find((item) => item.id === id)?.postalCode || ''); }} className={inputClass}>
          <option value={0}>Mahalle seçin</option>
          {neighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-slate-700">Posta kodu
        <input name="postal_code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" className={inputClass} />
      </label>
      {loading ? <p className="flex items-center gap-2 text-xs font-semibold text-sky-700 sm:col-span-2"><LoaderCircle className="h-4 w-4 animate-spin" />Güncel adres verileri yükleniyor…</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 sm:col-span-2">{error} Lütfen bağlantınızı kontrol edip tekrar deneyin.</p> : null}
    </>
  );
}
