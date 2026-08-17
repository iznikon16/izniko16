import 'server-only';

import {
  getCities,
  getDistrictsByCityCode,
  getNeighbourhoodsByCityCodeAndDistrict,
} from 'turkey-neighbourhoods';

export type TurkeyCityOption = {
  code: string;
  name: string;
};

function normalizeTurkeyLocation(value: string) {
  return value.trim().toLocaleLowerCase('tr');
}

export function getTurkeyCities(): TurkeyCityOption[] {
  return getCities();
}

export function getTurkeyCityCode(value: string) {
  const normalizedValue = normalizeTurkeyLocation(value);

  if (/^\d{2}$/.test(value)) {
    return getTurkeyCities().some((city) => city.code === value) ? value : null;
  }

  return getTurkeyCities().find((city) => normalizeTurkeyLocation(city.name) === normalizedValue)?.code ?? null;
}

export function getTurkeyDistricts(cityCodeOrName: string) {
  const cityCode = getTurkeyCityCode(cityCodeOrName);

  if (!cityCode) {
    return [];
  }

  return getDistrictsByCityCode(cityCode);
}

export function getTurkeyNeighbourhoods(cityCodeOrName: string, districtName: string) {
  const cityCode = getTurkeyCityCode(cityCodeOrName);

  if (!cityCode) {
    return [];
  }

  const district = getTurkeyDistricts(cityCode).find(
    (value) => normalizeTurkeyLocation(value) === normalizeTurkeyLocation(districtName)
  );

  if (!district) {
    return [];
  }

  return getNeighbourhoodsByCityCodeAndDistrict(cityCode, district);
}
