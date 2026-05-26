import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  for (const name of ["sb-access-token", "sb-refresh-token"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
