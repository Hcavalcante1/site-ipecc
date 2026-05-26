import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
