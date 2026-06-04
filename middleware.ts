import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_GATE_COOKIE = "ipecc_admin_gate";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdminPath = pathname.startsWith("/admin");
  const res = NextResponse.next();

  if (!isAdminPath) {
    if (req.cookies.has(ADMIN_GATE_COOKIE)) {
      res.cookies.set(ADMIN_GATE_COOKIE, "", { path: "/", maxAge: 0 });
    }

    return res;
  }

  if (req.cookies.get(ADMIN_GATE_COOKIE)?.value !== "1") {
    const redirect = NextResponse.redirect(new URL("/login", req.url));
    redirect.cookies.set(ADMIN_GATE_COOKIE, "", { path: "/", maxAge: 0 });
    return redirect;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin", {
    user_id: user.id,
  });

  if (error || !isAdmin) {
    const redirect = NextResponse.redirect(new URL("/login", req.url));
    redirect.cookies.set(ADMIN_GATE_COOKIE, "", { path: "/", maxAge: 0 });
    return redirect;
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/inicio/:path*",
    "/quem-somos/:path*",
    "/projetos/:path*",
    "/eventos/:path*",
    "/noticias/:path*",
    "/transparencia/:path*",
    "/editais/:path*",
    "/contato/:path*",
    "/propostas/:path*",
    "/admin/:path*",
  ],
};
