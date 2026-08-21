import { handlePaytrCallback } from "@/lib/payments/gateway";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    await handlePaytrCallback({
      failedReasonCode: String(formData.get("failed_reason_code") ?? "") || undefined,
      failedReasonMessage: String(formData.get("failed_reason_msg") ?? "") || undefined,
      hash: String(formData.get("hash") ?? ""),
      merchantOid: String(formData.get("merchant_oid") ?? ""),
      status: String(formData.get("status") ?? ""),
      totalAmount: String(formData.get("total_amount") ?? ""),
    });
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("PayTR callback failed:", error instanceof Error ? error.message : error);
    return new Response("FAILED", { status: 400 });
  }
}
