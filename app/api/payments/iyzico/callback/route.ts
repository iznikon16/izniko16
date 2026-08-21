import { redirect } from "next/navigation";
import { handleIyzicoCallback } from "@/lib/payments/gateway";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();

  if (!token) return Response.json({ ok: false }, { status: 400 });

  let attemptId: string;

  try {
    const result = await handleIyzicoCallback(token);
    attemptId = result.attemptId;
  } catch (error) {
    console.error("iyzico callback failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 400 });
  }

  redirect(`/odeme/sonuc?attempt=${encodeURIComponent(attemptId)}`);
}
