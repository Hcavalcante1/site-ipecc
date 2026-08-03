import type { Metadata } from "next";
import { supabasePublic as supabase } from "@/lib/supabasePublic";
import SolicitacaoLgpdForm from "./SolicitacaoLgpdForm";

export const metadata: Metadata = {
  title: "Política de Privacidade — IPECC",
  description: "Como o Instituto IPECC coleta, usa e protege seus dados pessoais, conforme a LGPD (Lei 13.709/2018).",
};

export const dynamic = "force-dynamic";

const TEXTO_FALLBACK = `
## 1. Quem somos

O Instituto IPECC (CNPJ 05.965.225/0001-04) é o controlador dos dados pessoais coletados neste site.

## 2. Quais dados coletamos

- **Formulários de contato e propostas**: nome, e-mail, telefone e informações fornecidas voluntariamente.
- **Leads via WhatsApp**: nome e número de telefone quando você inicia uma conversa pelo nosso canal.
- **Beneficiários cadastrados**: dados necessários à gestão de programas sociais (nome, e-mail, telefone, município).
- **Cookies essenciais**: identificadores de sessão para funcionamento do site. Cookies analíticos são coletados apenas com seu consentimento.

## 3. Como usamos seus dados

Seus dados são usados para: responder solicitações, enviar comunicações relacionadas a editais e projetos, gerir programas sociais e cumprir obrigações legais.

## 4. Base legal

Tratamos dados com base no **consentimento** (art. 7º, I), no **legítimo interesse** (art. 7º, IX) e no **cumprimento de obrigação legal** (art. 7º, II) da Lei 13.709/2018 — LGPD.

## 5. Compartilhamento

Não vendemos dados pessoais. Podemos compartilhar com prestadores de serviço (hospedagem, e-mail, analytics) que operam sob acordos de confidencialidade.

## 6. Retenção

Dados de contato são mantidos pelo tempo necessário para atender à solicitação e conforme exigências legais. Dados de beneficiários são mantidos durante a vigência dos programas.

## 7. Seus direitos (LGPD, art. 18)

Você pode, a qualquer momento, solicitar: acesso aos seus dados, correção, exclusão, portabilidade, revogação de consentimento ou informações sobre o uso. Use o formulário abaixo.

## 8. Cookies

Você pode gerenciar suas preferências de cookies pelo banner exibido na primeira visita ou nos configurações do seu navegador.

## 9. Contato com o DPO

Para questões sobre privacidade: **contato@ipecc.org.br**

*Última atualização: agosto de 2025. Versão 1.0.*
`;

function renderMd(md: string) {
  const lines = md.trim().split("\n");
  const els: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      els.push(<h2 key={i} style={s.h2}>{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      els.push(<h1 key={i} style={s.h1}>{line.slice(2)}</h1>);
    } else if (line.trim() === "") {
      // skip blank
    } else {
      // inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part
      );
      els.push(<p key={i} style={s.p}>{parts}</p>);
    }
    i++;
  }
  return els;
}

export default async function PoliticaPrivacidadePage() {
  const { data } = await supabase
    .from("paginas_conteudo")
    .select("texto")
    .eq("pagina_slug", "lgpd")
    .eq("bloco", "politica")
    .maybeSingle();

  const texto = data?.texto?.trim() || TEXTO_FALLBACK;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <span style={s.kicker}>LGPD · Lei 13.709/2018</span>
          <h1 style={s.titulo}>Política de Privacidade</h1>
          <p style={s.sub}>
            Transparência sobre como coletamos, usamos e protegemos seus dados pessoais.
          </p>
        </header>

        <article style={s.artigo}>
          {renderMd(texto)}
        </article>

        <section style={s.formSection}>
          <h2 style={s.formTitulo}>Exercer seus direitos (LGPD)</h2>
          <p style={s.formSub}>
            Preencha o formulário abaixo para solicitar acesso, correção, exclusão ou portabilidade dos seus dados.
            Respondemos em até 15 dias úteis.
          </p>
          <SolicitacaoLgpdForm />
        </section>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { background: "#f8fafc", minHeight: "100vh", paddingBottom: 64 },
  container: { maxWidth: 760, margin: "0 auto", padding: "48px 24px" },
  header: { marginBottom: 40, paddingBottom: 24, borderBottom: "2px solid #e2e8f0" },
  kicker: { display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "#1d4ed8", background: "#eff6ff", padding: "3px 10px", borderRadius: 999, marginBottom: 12 },
  titulo: { margin: "0 0 10px", fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1.2 },
  sub: { margin: 0, fontSize: 15, color: "#64748b" },
  artigo: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "32px 36px", marginBottom: 40 },
  h1: { fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "0 0 14px" },
  h2: { fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "28px 0 8px", paddingTop: 8, borderTop: "1px solid #f1f5f9" },
  p: { margin: "0 0 12px", fontSize: 14, color: "#334155", lineHeight: 1.75 },
  formSection: { background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "32px 36px" },
  formTitulo: { margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" },
  formSub: { margin: "0 0 24px", fontSize: 13, color: "#64748b", lineHeight: 1.6 },
};
