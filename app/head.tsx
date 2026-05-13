export default function Head() {
  const title = "IPECC | Instituto Paulista de Esporte, Cultura e Cidadania";
  const description =
    "Conheça o IPECC, suas ações, projetos, transparência institucional, editais, notícias, eventos e canais de contato.";
  const baseUrl = "https://apecc.ong.br";
  const ogImage = `${baseUrl}/media/global/logos/ipecc_logo_v2.png`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="index, follow" />
      <meta name="theme-color" content="#0b2a6b" />
      <link rel="canonical" href={baseUrl} />
      <link rel="icon" href="/media/global/logos/ipecc_logo_v2.png" />
      <link rel="apple-touch-icon" href="/media/global/logos/ipecc_logo_v2.png" />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="IPECC" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={baseUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "IPECC - Instituto Paulista de Esporte, Cultura e Cidadania",
            alternateName: "IPECC",
            url: baseUrl,
            logo: ogImage,
            email: "contato@apecc.ong.br",
            telephone: "+55-11-94331-2119",
            sameAs: [
              "https://www.instagram.com/ipecc.sp/",
              "https://www.facebook.com/profile.php?id=61580740405079",
              "https://www.youtube.com/@InstitutoPaulistaIPECC",
              "https://www.linkedin.com/in/instituto-paulista-ipecc-9037b73b6/",
              "https://www.tiktok.com/@ipecc.sp"
            ]
          }),
        }}
      />
    </>
  );
}
