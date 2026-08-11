import type { CSSProperties } from "react";
import classes from "../page.module.css";
import type { Convenio } from "../types";
import { TIPO_INSTRUMENTO_OPTIONS, CATEGORIA_OPTIONS, STATUS_CONVENIO_OPTIONS } from "../constants";
import { AdminButton, AdminLoadingButton, AdminCard, AdminMessage, AdminInput, AdminTextarea, AdminSelect, AdminFileInput } from "@/components/admin";

type Props = {
  item: Convenio;
  index: number;
  blockMsgs: Record<number, string>;
  loadingIndex: number | null;
  loadingOperationType: "save" | "delete" | "upload" | null;
  updateConvenio: <K extends keyof Convenio>(index: number, campo: K, valor: Convenio[K]) => void;
  salvarBloco: (index: number) => Promise<void>;
  excluirBloco: (id?: string, index?: number) => Promise<void>;
};

const styles: Record<string, CSSProperties> = {
  recordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  recordTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "#f8fafc",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.14)",
    color: "#86efac",
    border: "1px solid rgba(34,197,94,0.28)",
    fontSize: "0.84rem",
    fontWeight: 700,
  },
  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    color: "#cbd5e1",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: "0.84rem",
    fontWeight: 700,
  },
  full: {
    gridColumn: "1 / -1",
  },
  fieldWrap: {
    display: "grid",
    gap: 6,
  },
  label: {
    fontSize: "0.93rem",
    fontWeight: 700,
    color: "#e2e8f0",
  },
  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#e5e7eb",
    fontWeight: 700,
  },
  blockMsg: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: "0.92rem",
  },
};

function getMessageType(message: string): "success" | "error" | "info" {
  if (message.includes("✔") || message.toLowerCase().includes("sucesso") || message.toLowerCase().includes("salvo")) {
    return "success";
  }
  if (message.includes("✘") || message.toLowerCase().includes("erro") || message.toLowerCase().includes("falhou")) {
    return "error";
  }
  return "info";
}

export default function ConvenioCard({
  item,
  index,
  blockMsgs,
  loadingIndex,
  loadingOperationType,
  updateConvenio,
  salvarBloco,
  excluirBloco,
}: Props) {
  return (
    <AdminCard className={classes.recordCard}>
      <div style={styles.recordHeader}>
        <h2 style={styles.recordTitle}>Convênio {index + 1}</h2>
        <span style={item.publicado ? styles.badge : styles.badgeMuted}>
          {item.publicado ? "Publicado" : "Oculto"}
        </span>
      </div>

      <div className="admin-grid-2" style={{ gap: 14 }}>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Referencia do edital publicado</label>
          <AdminInput className={classes.input} value={item.edital_id ?? ""} onChange={(e) => updateConvenio(index, "edital_id", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Título</label>
          <AdminInput className={classes.input} value={item.titulo ?? ""} onChange={(e) => updateConvenio(index, "titulo", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Número do instrumento</label>
          <AdminInput className={classes.input} value={item.numero_instrumento ?? ""} onChange={(e) => updateConvenio(index, "numero_instrumento", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Tipo do instrumento</label>
          <AdminSelect className={classes.select} value={item.tipo_instrumento ?? ""} onChange={(e) => updateConvenio(index, "tipo_instrumento", e.target.value)}>
            {TIPO_INSTRUMENTO_OPTIONS.map((opcao) => (
              <option key={opcao || "vazio"} value={opcao}>
                {opcao || "Selecione"}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Categoria</label>
          <AdminSelect className={classes.select} value={item.categoria ?? ""} onChange={(e) => updateConvenio(index, "categoria", e.target.value)}>
            {CATEGORIA_OPTIONS.map((opcao) => (
              <option key={opcao || "vazio"} value={opcao}>
                {opcao || "Selecione"}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Status</label>
          <AdminSelect className={classes.select} value={item.status ?? ""} onChange={(e) => updateConvenio(index, "status", e.target.value)}>
            {STATUS_CONVENIO_OPTIONS.map((opcao) => (
              <option key={opcao || "vazio"} value={opcao}>
                {opcao || "Selecione"}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={{ ...styles.fieldWrap, ...styles.full }}>
          <label style={styles.label}>Objeto</label>
          <AdminTextarea className={classes.textarea} value={item.objeto ?? ""} onChange={(e) => updateConvenio(index, "objeto", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Contratado</label>
          <AdminInput className={classes.input} value={item.contratado ?? ""} onChange={(e) => updateConvenio(index, "contratado", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>CNPJ</label>
          <AdminInput className={classes.input} value={item.cnpj ?? ""} onChange={(e) => updateConvenio(index, "cnpj", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Data de assinatura</label>
          <AdminInput type="date" className={classes.input} value={item.data_assinatura ?? ""} onChange={(e) => updateConvenio(index, "data_assinatura", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Vigência inicial</label>
          <AdminInput type="date" className={classes.input} value={item.vigencia_inicio ?? ""} onChange={(e) => updateConvenio(index, "vigencia_inicio", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Vigência final</label>
          <AdminInput type="date" className={classes.input} value={item.vigencia_fim ?? ""} onChange={(e) => updateConvenio(index, "vigencia_fim", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Ordem</label>
          <AdminInput type="number" className={classes.input} value={item.ordem ?? 0} onChange={(e) => updateConvenio(index, "ordem", Number(e.target.value))} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Plano de trabalho URL</label>
          <AdminInput className={classes.input} value={item.plano_trabalho_url ?? ""} onChange={(e) => updateConvenio(index, "plano_trabalho_url", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Documento principal URL</label>
          <AdminInput className={classes.input} value={item.documento_principal_url ?? ""} onChange={(e) => updateConvenio(index, "documento_principal_url", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Relatório parcial URL</label>
          <AdminInput className={classes.input} value={item.relatorio_parcial_url ?? ""} onChange={(e) => updateConvenio(index, "relatorio_parcial_url", e.target.value)} />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Relatório final URL</label>
          <AdminInput className={classes.input} value={item.relatorio_final_url ?? ""} onChange={(e) => updateConvenio(index, "relatorio_final_url", e.target.value)} />
        </div>

        <div style={{ ...styles.fieldWrap, ...styles.full }}>
          <label style={styles.label}>Observações</label>
          <AdminTextarea className={classes.textarea} value={item.observacoes ?? ""} onChange={(e) => updateConvenio(index, "observacoes", e.target.value)} />
        </div>
      </div>

      <div className={classes.footer}>
        <label style={styles.switchRow}>
          <AdminInput type="checkbox" checked={item.publicado ?? false} onChange={(e) => updateConvenio(index, "publicado", e.target.checked)} />
          Publicado
        </label>

        <div className={classes.toolbar}>
          <AdminLoadingButton
            type="button"
            variant="primary"
            className={classes.greenBtn}
            onClick={() => salvarBloco(index)}
            loading={loadingIndex === index && loadingOperationType === "save"}
            loadingText="Salvando..."
          >
            Salvar bloco
          </AdminLoadingButton>
          <AdminLoadingButton
            type="button"
            variant="danger"
            className={classes.redBtn}
            onClick={() => excluirBloco(item.id, index)}
            loading={loadingIndex === index && loadingOperationType === "delete"}
            loadingText="Excluindo..."
          >
            Excluir bloco
          </AdminLoadingButton>
        </div>
      </div>

      {blockMsgs[index] ? <AdminMessage message={blockMsgs[index]} type={getMessageType(blockMsgs[index])} style={styles.blockMsg} /> : null}
    </AdminCard>
  );
}
