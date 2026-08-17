'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  PAYMENT_PROVIDER_DEFINITIONS,
  getPaymentProviderDefinition,
  type PaymentProviderConfigField,
  type PaymentProviderKey,
} from '@/lib/commerce/payment-provider-presets';
import { cn } from '@/lib/utils';

type PaymentMethodConfigFieldsProps = {
  config: unknown;
  integrationType: string;
  provider: PaymentProviderKey;
  sortOrder: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringifyConfigValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return typeof value === 'string' ? value : '';
}

function getFieldInitialValues(provider: PaymentProviderKey, config: Record<string, unknown>) {
  const definition = PAYMENT_PROVIDER_DEFINITIONS[provider];
  const initialValues: Record<string, string> = {};

  for (const field of definition.configFields) {
    const defaultValue = definition.defaultConfig?.[field.key];
    initialValues[field.key] = stringifyConfigValue(config[field.key] ?? defaultValue ?? '');
  }

  return initialValues;
}

function getExtraConfig(provider: PaymentProviderKey, config: Record<string, unknown>) {
  const fieldKeys = new Set(PAYMENT_PROVIDER_DEFINITIONS[provider].configFields.map((field) => field.key));
  const extraEntries = Object.entries(config).filter(([key]) => !fieldKeys.has(key));
  return Object.fromEntries(extraEntries);
}

function toConfigValue(field: PaymentProviderConfigField, value: string) {
  if (field.type === 'boolean') {
    return value === 'true';
  }

  return value.trim();
}

function parseExtraJson(value: string) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;
  return isRecord(parsed) ? parsed : {};
}

function FieldInput({
  field,
  onChange,
  value,
}: {
  field: PaymentProviderConfigField;
  onChange: (key: string, value: string) => void;
  value: string;
}) {
  if (field.type === 'boolean') {
    return (
      <label className="flex min-h-[47px] items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-600">
        <span>{field.label}</span>
        <select
          value={value || 'false'}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="rounded-full border border-gray-200 bg-black px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-900 outline-none"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className="grid gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{field.label}</span>
        <textarea
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm leading-6 text-gray-900 outline-none"
        />
        {field.help ? <span className="text-xs leading-5 text-gray-400">{field.help}</span> : null}
      </label>
    );
  }

  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">{field.label}</span>
      <input
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        type={field.secret || field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
        className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none"
      />
      {field.help ? <span className="text-xs leading-5 text-gray-400">{field.help}</span> : null}
    </label>
  );
}

export function PaymentMethodConfigFields({
  config,
  integrationType,
  provider,
  sortOrder,
}: PaymentMethodConfigFieldsProps) {
  const initialConfig = isRecord(config) ? config : {};
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderKey>(provider);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState(integrationType || getPaymentProviderDefinition(provider).defaultIntegrationType);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => getFieldInitialValues(provider, initialConfig));
  const [extraJson, setExtraJson] = useState(() => JSON.stringify(getExtraConfig(provider, initialConfig), null, 2));

  const definition = PAYMENT_PROVIDER_DEFINITIONS[selectedProvider];
  const selectableDefinitions = Object.values(PAYMENT_PROVIDER_DEFINITIONS).filter((item) => item.selectable !== false || item.key === selectedProvider);

  const extraJsonError = useMemo(() => {
    try {
      parseExtraJson(extraJson);
      return null;
    } catch {
      return 'Ek JSON alanı geçerli bir obje olmalı.';
    }
  }, [extraJson]);

  const configJson = useMemo(() => {
    const mergedConfig = extraJsonError ? {} : parseExtraJson(extraJson);

    for (const field of definition.configFields) {
      const value = fieldValues[field.key] ?? '';

      if (field.type === 'boolean') {
        mergedConfig[field.key] = toConfigValue(field, value);
      } else if (value.trim()) {
        mergedConfig[field.key] = toConfigValue(field, value);
      }
    }

    return JSON.stringify(mergedConfig, null, 2);
  }, [definition.configFields, extraJson, extraJsonError, fieldValues]);

  function handleProviderChange(value: string) {
    const nextProvider = getPaymentProviderDefinition(value).key;
    const nextDefinition = PAYMENT_PROVIDER_DEFINITIONS[nextProvider];

    setSelectedProvider(nextProvider);
    setSelectedIntegrationType(nextDefinition.defaultIntegrationType);
    setFieldValues(getFieldInitialValues(nextProvider, {}));
    setExtraJson('{}');
  }

  function updateFieldValue(key: string, value: string) {
    setFieldValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
      <div className="grid gap-3 md:grid-cols-[1fr_0.72fr_0.36fr]">
        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Sağlayıcı</span>
          <select
            name="provider"
            value={selectedProvider}
            onChange={(event) => handleProviderChange(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none"
          >
            {selectableDefinitions.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Entegrasyon</span>
          <select
            name="integration_type"
            value={selectedIntegrationType}
            onChange={(event) => setSelectedIntegrationType(event.target.value)}
            className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none"
          >
            <option value="manual">Manuel teyit</option>
            <option value="redirect">Güvenli yönlendirme</option>
            <option value="api">API bağlantısı</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Sıra</span>
          <input
            name="sort_order"
            type="number"
            defaultValue={sortOrder}
            className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none"
          />
        </label>
      </div>

      <div className="rounded-[18px] border border-blue-300/20 bg-blue-600/10 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">{definition.label}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">{definition.defaultDescription}</p>
          </div>
          {definition.docsUrl ? (
            <a href={definition.docsUrl} target="_blank" rel="noreferrer" className="rounded-full border border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 hover:bg-blue-50">
              Doküman
            </a>
          ) : null}
        </div>
      </div>

      {definition.configFields.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {definition.configFields.map((field) => (
            <FieldInput key={field.key} field={field} value={fieldValues[field.key] ?? ''} onChange={updateFieldValue} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-500">
          Bu sağlayıcı tipi için yeni ayar alanı yok.
        </p>
      )}

      <details className="group overflow-hidden rounded-[18px] border border-gray-100 bg-white/[0.02]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none marker:hidden">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Ek JSON ayarları</p>
            {extraJsonError ? <p className="mt-1 text-xs text-red-200">{extraJsonError}</p> : null}
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>
        <label className="grid gap-2 border-t border-gray-100 p-3">
          <textarea
            value={extraJson}
            onChange={(event) => setExtraJson(event.target.value)}
            rows={3}
            className={cn(
              'rounded-2xl border bg-[#0d0d0d] px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none',
              extraJsonError ? 'border-red-500/50' : 'border-gray-200'
            )}
          />
          <span className={cn('text-xs leading-5', extraJsonError ? 'text-red-200' : 'text-gray-400')}>
            {extraJsonError ?? 'Alan şablonda yoksa burada obje olarak saklanır. Gizli değerler checkout tarafına gönderilmez.'}
          </span>
        </label>
      </details>

      <input type="hidden" name="config" value={configJson} />
    </div>
  );
}
