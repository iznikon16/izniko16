import { normalizeTurkishPhone, renderTemplate } from '@/lib/sms/netgsm';

describe('Netgsm template safety', () => {
  it('Türkçe içerik ve snake_case değişkenleri bozmadan işler', () => {
    expect(renderTemplate('Sayın {{customer_name}}, {{due_amount}} ödemeniz gecikti.', {
      customer_name: 'Çağrı Şahin',
      due_amount: '1.250,00 ₺',
    })).toBe('Sayın Çağrı Şahin, 1.250,00 ₺ ödemeniz gecikti.');
  });

  it('tanımsız değişkeni görünür bırakarak sessiz veri kaybını önler', () => {
    expect(renderTemplate('{{customer_name}} / {{missing}}', { customer_name: 'İznikon' }))
      .toBe('İznikon / {{missing}}');
  });

  it.each([
    ['0532 111 22 33', '905321112233'],
    ['5321112233', '905321112233'],
    ['+90 532 111 22 33', '905321112233'],
  ])('%s telefonunu Netgsm biçimine çevirir', (input, expected) => {
    expect(normalizeTurkishPhone(input)).toBe(expected);
  });
});
