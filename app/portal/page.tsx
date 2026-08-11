import { permanentRedirect } from "next/navigation";

/** URL legada — conteúdo era duplicado da home (`/`). Ver `/apresentacao`, mesmo padrão. */
export default function PortalRedirectPage() {
  permanentRedirect("/");
}
