import { permanentRedirect } from "next/navigation";

/** URL legada — conteúdo editorial em `/inicio`. */
export default function PortalLegacyRedirectPage() {
  permanentRedirect("/inicio");
}
