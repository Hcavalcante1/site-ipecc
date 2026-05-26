import { NextResponse } from "next/server";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "apecc-site",
    version: packageJson.version,
    runtime: "next",
    checkedAt: new Date().toISOString(),
  });
}
