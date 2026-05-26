import { permanentRedirect } from "next/navigation";

/** URL legada — index oficial é `/` (SEO). */
export default function ApresentacaoRedirectPage() {
  permanentRedirect("/");
}
