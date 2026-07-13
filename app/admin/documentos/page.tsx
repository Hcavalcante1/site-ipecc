import { redirect } from "next/navigation";

export default function DocumentosIndexPage() {
  redirect("/admin/documentos/dashboard");
}
