import Link from "next/link";
import { requireMestreSession } from "@/lib/auth/adminSession";

export const dynamic = "force-dynamic";
const modulos = ["Inclusão Digital e Serviços Básicos", "Produtividade e Apoio Administrativo", "Design e Conteúdo Digital", "Vendas, Divulgação e Atendimento Digital", "Empreendedorismo, Portfólio e Inserção Produtiva"];
const dias = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];

export default async function AvaPage() {
  const auth = await requireMestreSession();
  if (auth.ok === false) return <section style={{padding:24}}><h1>AVA IPECC</h1><p>{auth.message}</p><Link href="/admin">Voltar ao painel</Link></section>;
  return <section style={{padding:24, maxWidth:1100, margin:"0 auto"}}>
    <p style={{color:"#94a3b8",fontSize:12,letterSpacing:2}}>IPECC · FORMAÇÃO INTERNA</p>
    <h1 className="admin-h1">Ambiente Virtual de Aprendizagem</h1>
    <p>Projeto Novo Rumo — Curso de Informática Produtiva</p>
    <div style={{padding:18,border:"1px solid #475569",borderRadius:12,margin:"24px 0",background:"#17283c"}}>
      <strong>Implantação inicial no painel do IPECC</strong>
      <p>Estrutura pedagógica baseada no TRP Novo Rumo. Matrículas, aulas, entregas e banco de dados ainda serão implementados. Nenhum aluno está cadastrado nesta tela.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
      {[ ["Carga presencial oficial", "200 horas"], ["AVA complementar previsto", "Até 40 horas"], ["Capacidade planejada", "5 turmas · 100 participantes"] ].map(([label,value])=><div key={label} style={{padding:20,border:"1px solid #334155",borderRadius:12}}><p style={{color:"#94a3b8",fontSize:13}}>{label}</p><strong style={{fontSize:23}}>{value}</strong></div>)}
    </div>
    <h2 style={{marginTop:32}}>Percurso de formação</h2>
    <p>Os cinco módulos serão realizados de forma sequencial, com 40 horas presenciais por módulo. As atividades do AVA são complementares e não integram as 200 horas oficiais.</p>
    {modulos.map((titulo,i)=><details key={titulo} style={{padding:18,borderBottom:"1px solid #334155"}}><summary style={{cursor:"pointer",fontWeight:600}}>{i+1}. {titulo} · 40h presenciais</summary><p>Oito encontros presenciais de cinco horas, com duração aproximada de dois meses. Atividades complementares, produto prático e avaliação serão cadastrados na próxima etapa.</p></details>)}
    <h2 style={{marginTop:32}}>Turmas previstas</h2>
    <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left",borderCollapse:"collapse"}}><thead><tr>{["Turma","Encontro presencial","Horário","Vagas previstas"].map(x=><th key={x} style={{padding:12}}>{x}</th>)}</tr></thead><tbody>{dias.map((dia,i)=><tr key={dia}>{["Turma "+(i+1),dia,"13h às 18h","20"].map((x,j)=><td key={j} style={{padding:12,borderTop:"1px solid #334155"}}>{x}</td>)}</tr>)}</tbody></table></div>
    <h2 style={{marginTop:32}}>Acompanhamento e certificação</h2>
    <p>Curso nos meses 2 a 11, durante 40 semanas. O TRP prevê seis atividades orientadas no AVA por semana, de aproximadamente dez minutos cada, sem atividade obrigatória no dia presencial. A data de início ainda será definida.</p>
    <p>O certificado de 200h exige frequência presencial mínima de 70% e aproveitamento satisfatório. A declaração complementar de até 40h deve ser proporcional às atividades orientadas concluídas, com registro separado. Abertura da plataforma não comprova conclusão.</p>
    <p style={{color:"#94a3b8",fontSize:13}}>O arquivo do Instituto Recriar Vidas é apenas referência de estrutura. A base deste curso é o TRP Novo Rumo do IPECC. Acesso inicial restrito ao administrador mestre.</p>
  </section>;
}
