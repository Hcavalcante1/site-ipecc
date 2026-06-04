import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth/adminSession";

const ADMIN_GATE_COOKIE = "ipecc_admin_gate";
const ADMIN_GATE_MAX_AGE = 10;

export async function POST() {
  const auth = await verifyAdminSession();

  if (auth.ok === false) {
    return NextResponse.json(
      { error: auth.message },
      { status: auth.status }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_GATE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_GATE_MAX_AGE,
  });

  return res;
}
