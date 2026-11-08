import { redirect } from "next/navigation";

export default function LegacyInviteRedirect({ params }: { params: { token: string } }) {
  redirect(`/admin/convite/acesso/${encodeURIComponent(params.token)}`);
}
