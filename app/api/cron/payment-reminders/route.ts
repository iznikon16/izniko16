import { timingSafeEqual } from 'node:crypto';
import { dispatchScheduledPaymentReminders } from '@/lib/sms/payment-notifications';

export const dynamic = 'force-dynamic';

function hasValidCronSecret(request: Request) {
  const configured = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!configured || configured.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ ok: false, message: 'Yetkisiz istek.' }, { status: 401 });
  }

  try {
    const result = await dispatchScheduledPaymentReminders();
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ ok: false, message: 'Vade bildirimleri işlenemedi.' }, { status: 500 });
  }
}
