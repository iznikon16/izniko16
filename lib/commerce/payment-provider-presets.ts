export const PAYMENT_PROVIDER_VALUES = [
  'offline',
  'saved_card',
  'iyzico',
  'stripe',
  'paytr',
  'param',
  'sipay',
  'paycell',
  'paynet',
  'paratika',
  'moka',
  'craftgate',
  'payu',
  'shopier',
  'papara',
  'hepsipay',
  'bank_pos',
  'odeal',
  'custom',
] as const;

export type PaymentProviderKey = (typeof PAYMENT_PROVIDER_VALUES)[number];

export type PaymentProviderConfigField = {
  help?: string;
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
  type?: 'boolean' | 'password' | 'text' | 'textarea' | 'url';
};

export type PaymentProviderDefinition = {
  configFields: PaymentProviderConfigField[];
  defaultCode: string;
  defaultConfig?: Record<string, string | boolean>;
  defaultDescription: string;
  defaultInstructions: string;
  defaultIntegrationType: 'api' | 'manual' | 'redirect';
  docsUrl?: string;
  key: PaymentProviderKey;
  label: string;
  selectable?: boolean;
};

const callbackField: PaymentProviderConfigField = {
  help: 'Sağlayıcı panelinde ödeme sonucu bildirimi için kullanılacak endpoint.',
  key: 'callbackUrl',
  label: 'Callback / webhook URL',
  placeholder: 'https://site.com/api/payments/provider/callback',
  type: 'url',
};

const successField: PaymentProviderConfigField = {
  key: 'successUrl',
  label: 'Başarılı dönüş URL',
  placeholder: 'https://site.com/odeme/basarili',
  type: 'url',
};

const failField: PaymentProviderConfigField = {
  key: 'failUrl',
  label: 'Başarısız dönüş URL',
  placeholder: 'https://site.com/odeme/basarisiz',
  type: 'url',
};

const baseUrlField: PaymentProviderConfigField = {
  key: 'baseUrl',
  label: 'API base URL',
  placeholder: 'https://api.provider.com',
  type: 'url',
};

const apiKeyField: PaymentProviderConfigField = {
  key: 'apiKey',
  label: 'API key',
  placeholder: 'API key',
  secret: true,
  type: 'password',
};

const secretKeyField: PaymentProviderConfigField = {
  key: 'secretKey',
  label: 'Secret key',
  placeholder: 'Secret key',
  secret: true,
  type: 'password',
};

const merchantIdField: PaymentProviderConfigField = {
  key: 'merchantId',
  label: 'Merchant ID',
  placeholder: 'Merchant / üye iş yeri no',
};

const testModeField: PaymentProviderConfigField = {
  key: 'testMode',
  label: 'Test modu',
  type: 'boolean',
};

export const PAYMENT_PROVIDER_DEFINITIONS: Record<PaymentProviderKey, PaymentProviderDefinition> = {
  offline: {
    configFields: [
      { key: 'bankName', label: 'Banka adı', placeholder: 'Banka' },
      { key: 'accountOwner', label: 'Hesap sahibi', placeholder: 'Firma ünvanı' },
      { key: 'iban', label: 'IBAN', placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
      { key: 'supportPhone', label: 'Teyit telefonu', placeholder: '+90...' },
    ],
    defaultCode: 'havale-eft',
    defaultDescription: 'Sipariş ödeme bekliyor durumunda açılır ve dekont sonrası teyit edilir.',
    defaultInstructions: 'Havale/EFT yaparken açıklama kısmına sipariş numaranızı yazın. Dekont sonrası ödeme ekip tarafından teyit edilir.',
    defaultIntegrationType: 'manual',
    key: 'offline',
    label: 'Offline / Havale EFT',
  },
  saved_card: {
    configFields: [],
    defaultCode: 'kayitli-kart',
    defaultDescription: 'Eski kayıtlı kart sağlayıcı tipi. Kart saklama kullanılmadığı için yeni kurulumlarda seçmeyin.',
    defaultInstructions: 'Kart saklama devre dışı.',
    defaultIntegrationType: 'api',
    key: 'saved_card',
    label: 'Kayıtlı Kart (Eski)',
    selectable: false,
  },
  odeal: {
    configFields: [],
    defaultCode: 'odeal',
    defaultDescription: 'Ödeal sanal POS tahsilatı; bağlantı bilgileri Ödeal entegrasyon ayarlarından yönetilir.',
    defaultInstructions: 'Kart bilgileri Ödeal güvenli ödeme akışında işlenir.',
    defaultIntegrationType: 'api',
    key: 'odeal',
    label: 'Ödeal',
    selectable: false,
  },
  iyzico: {
    configFields: [
      apiKeyField,
      secretKeyField,
      { key: 'merchantId', label: 'Merchant ID', placeholder: 'iyzico merchantId' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'iyzico',
    defaultConfig: {
      baseUrl: 'https://sandbox-api.iyzipay.com',
      testMode: true,
    },
    defaultDescription: 'iyzico Checkout Form veya API akışı ile güvenli kart tahsilatı.',
    defaultInstructions: 'Kart bilgileri iyzico güvenli ödeme ekranında işlenir.',
    defaultIntegrationType: 'redirect',
    docsUrl: 'https://docs.iyzico.com/',
    key: 'iyzico',
    label: 'iyzico',
  },
  stripe: {
    configFields: [
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_...' },
      secretKeyField,
      { key: 'webhookSecret', label: 'Webhook secret', placeholder: 'whsec_...', secret: true, type: 'password' },
      callbackField,
      testModeField,
    ],
    defaultCode: 'stripe',
    defaultDescription: 'Stripe ödeme bağlantısı veya API tahsilatı.',
    defaultInstructions: 'Kart bilgileri Stripe güvenli ödeme ekranında işlenir.',
    defaultIntegrationType: 'redirect',
    key: 'stripe',
    label: 'Stripe',
  },
  paytr: {
    configFields: [
      merchantIdField,
      { key: 'merchantKey', label: 'Merchant key', placeholder: 'PayTR merchant_key', secret: true, type: 'password' },
      { key: 'merchantSalt', label: 'Merchant salt', placeholder: 'PayTR merchant_salt', secret: true, type: 'password' },
      callbackField,
      successField,
      failField,
      testModeField,
    ],
    defaultCode: 'paytr',
    defaultDescription: 'PayTR iFrame, Link veya Direkt API ile sanal POS tahsilatı.',
    defaultInstructions: 'Ödeme PayTR güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    docsUrl: 'https://dev.paytr.com/',
    key: 'paytr',
    label: 'PayTR',
  },
  param: {
    configFields: [
      { key: 'clientCode', label: 'CLIENT_CODE', placeholder: '10738' },
      { key: 'clientUsername', label: 'CLIENT_USERNAME', placeholder: 'Kullanıcı adı' },
      { key: 'clientPassword', label: 'CLIENT_PASSWORD', placeholder: 'Şifre', secret: true, type: 'password' },
      { key: 'guid', label: 'GUID', placeholder: 'Param GUID', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      successField,
      failField,
      testModeField,
    ],
    defaultCode: 'param',
    defaultConfig: {
      baseUrl: 'https://testposws.param.com.tr/turkpos.ws/service_turkpos_prod.asmx?wsdl',
      testMode: true,
    },
    defaultDescription: 'ParamPOS ortak ödeme, iFrame veya API tahsilatı.',
    defaultInstructions: 'Ödeme ParamPOS güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    docsUrl: 'https://dev.param.com.tr/tr/api',
    key: 'param',
    label: 'Param',
  },
  sipay: {
    configFields: [
      { key: 'appId', label: 'App ID', placeholder: 'Sipay app_id' },
      { key: 'appSecret', label: 'App secret', placeholder: 'Sipay app_secret', secret: true, type: 'password' },
      { key: 'merchantKey', label: 'Merchant key', placeholder: 'Merchant key', secret: true, type: 'password' },
      merchantIdField,
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'sipay',
    defaultDescription: 'Sipay sanal POS ve ödeme orkestrasyonu.',
    defaultInstructions: 'Ödeme Sipay güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'sipay',
    label: 'Sipay',
  },
  paycell: {
    configFields: [
      { key: 'merchantCode', label: 'Merchant code', placeholder: 'Paycell merchant code' },
      { key: 'terminalId', label: 'Terminal ID', placeholder: 'Terminal ID' },
      { key: 'secureCode', label: 'Secure code', placeholder: 'Secure code', secret: true, type: 'password' },
      { key: 'clientSecret', label: 'Client secret', placeholder: 'Client secret', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'paycell',
    defaultDescription: 'Paycell kart, cüzdan veya operatör destekli ödeme akışı.',
    defaultInstructions: 'Ödeme Paycell güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'paycell',
    label: 'Paycell',
  },
  paynet: {
    configFields: [
      { key: 'agentId', label: 'Agent ID', placeholder: 'Paynet agent ID' },
      { key: 'secretKey', label: 'Secret key', placeholder: 'Secret key', secret: true, type: 'password' },
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'Publishable key' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'paynet',
    defaultDescription: 'Paynet sanal POS veya linkle ödeme tahsilatı.',
    defaultInstructions: 'Ödeme Paynet güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'paynet',
    label: 'Paynet',
  },
  paratika: {
    configFields: [
      { key: 'merchant', label: 'Merchant', placeholder: 'Paratika merchant' },
      { key: 'merchantUser', label: 'Merchant user', placeholder: 'Merchant user' },
      { key: 'merchantPassword', label: 'Merchant password', placeholder: 'Merchant password', secret: true, type: 'password' },
      { key: 'merchantKey', label: 'Merchant key', placeholder: 'Merchant key', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'paratika',
    defaultDescription: 'Paratika sanal POS ve ortak ödeme sayfası.',
    defaultInstructions: 'Ödeme Paratika güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'paratika',
    label: 'Paratika',
  },
  moka: {
    configFields: [
      { key: 'dealerCode', label: 'Dealer code', placeholder: 'Moka dealer code' },
      { key: 'username', label: 'Kullanıcı adı', placeholder: 'Kullanıcı adı' },
      { key: 'password', label: 'Şifre', placeholder: 'Şifre', secret: true, type: 'password' },
      { key: 'checkKey', label: 'Check key', placeholder: 'Check key', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'moka',
    defaultDescription: 'Moka sanal POS tahsilatı.',
    defaultInstructions: 'Ödeme Moka güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'moka',
    label: 'Moka',
  },
  craftgate: {
    configFields: [
      apiKeyField,
      secretKeyField,
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'craftgate',
    defaultDescription: 'Craftgate ödeme orkestrasyonu ve sanal POS bağlantısı.',
    defaultInstructions: 'Ödeme Craftgate güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'api',
    docsUrl: 'https://docs.craftgate.io/',
    key: 'craftgate',
    label: 'Craftgate',
  },
  payu: {
    configFields: [
      merchantIdField,
      { key: 'merchantKey', label: 'Merchant key', placeholder: 'Merchant key', secret: true, type: 'password' },
      { key: 'salt', label: 'Salt', placeholder: 'Salt', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'payu',
    defaultDescription: 'PayU yönlendirme veya API ödeme akışı.',
    defaultInstructions: 'Ödeme PayU güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'payu',
    label: 'PayU',
  },
  shopier: {
    configFields: [
      apiKeyField,
      { key: 'apiSecret', label: 'API secret', placeholder: 'API secret', secret: true, type: 'password' },
      { key: 'websiteIndex', label: 'Website index', placeholder: 'Shopier website index' },
      callbackField,
      testModeField,
    ],
    defaultCode: 'shopier',
    defaultDescription: 'Shopier ödeme bağlantısı veya mağaza tahsilatı.',
    defaultInstructions: 'Ödeme Shopier güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'shopier',
    label: 'Shopier',
  },
  papara: {
    configFields: [
      apiKeyField,
      merchantIdField,
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'papara',
    defaultDescription: 'Papara cüzdan veya ödeme bağlantısı.',
    defaultInstructions: 'Ödeme Papara güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'papara',
    label: 'Papara',
  },
  hepsipay: {
    configFields: [
      merchantIdField,
      { key: 'clientId', label: 'Client ID', placeholder: 'Client ID' },
      { key: 'clientSecret', label: 'Client secret', placeholder: 'Client secret', secret: true, type: 'password' },
      baseUrlField,
      callbackField,
      testModeField,
    ],
    defaultCode: 'hepsipay',
    defaultDescription: 'Hepsipay cüzdan veya kart ödeme akışı.',
    defaultInstructions: 'Ödeme Hepsipay güvenli ödeme akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'hepsipay',
    label: 'Hepsipay',
  },
  bank_pos: {
    configFields: [
      { key: 'bankName', label: 'Banka adı', placeholder: 'Garanti BBVA, Akbank, Yapı Kredi...' },
      merchantIdField,
      { key: 'terminalId', label: 'Terminal ID', placeholder: 'Terminal ID' },
      { key: 'storeKey', label: '3D store key', placeholder: 'Store key', secret: true, type: 'password' },
      { key: 'username', label: 'API kullanıcı adı', placeholder: 'Kullanıcı adı' },
      { key: 'password', label: 'API şifresi', placeholder: 'Şifre', secret: true, type: 'password' },
      baseUrlField,
      successField,
      failField,
      testModeField,
    ],
    defaultCode: 'banka-sanal-pos',
    defaultDescription: 'Banka sanal POS entegrasyonu.',
    defaultInstructions: 'Ödeme bankanın 3D Secure veya sanal POS akışında tamamlanır.',
    defaultIntegrationType: 'api',
    key: 'bank_pos',
    label: 'Banka Sanal POS',
  },
  custom: {
    configFields: [
      { key: 'providerName', label: 'Sağlayıcı adı', placeholder: 'Özel ödeme altyapısı' },
      baseUrlField,
      apiKeyField,
      secretKeyField,
      merchantIdField,
      callbackField,
      successField,
      failField,
      testModeField,
    ],
    defaultCode: 'ozel-odeme',
    defaultDescription: 'Özel ödeme sağlayıcısı entegrasyonu.',
    defaultInstructions: 'Ödeme özel sağlayıcı akışında tamamlanır.',
    defaultIntegrationType: 'redirect',
    key: 'custom',
    label: 'Özel Sağlayıcı',
  },
};

export function isPaymentProviderKey(value: string): value is PaymentProviderKey {
  return PAYMENT_PROVIDER_VALUES.includes(value as PaymentProviderKey);
}

export function getPaymentProviderDefinition(value: string) {
  return isPaymentProviderKey(value) ? PAYMENT_PROVIDER_DEFINITIONS[value] : PAYMENT_PROVIDER_DEFINITIONS.offline;
}

export function getPaymentIntegrationTypeLabel(value: string) {
  if (value === 'api') {
    return 'API';
  }

  if (value === 'redirect') {
    return 'Yönlendirme';
  }

  return 'Manuel';
}
