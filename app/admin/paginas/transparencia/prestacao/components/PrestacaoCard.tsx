import type { ChangeEvent, CSSProperties } from "react";
import classes from "../page.module.css";
import { AdminButton, AdminCard, AdminMessage, AdminInput, AdminTextarea, AdminSelect, AdminFileInput } from "@/components/admin";
import { Convenio, PrestacaoConta, LoadingOperationType, FASE_OPTIONS, STATUS_OPTIONS } from "../index";
import TipoDocumentoField from "@/components/admin/TipoDocumentoField";
import { TIPO_DOCUMENTO_OPTIONS } from "../constants";

type Props = {
  item: PrestacaoConta;
  index: number;
  convenios: Convenio[];
  blockMsgs: Record<number, string>;
  loadingIndex: number | null;
  loadingOperationType: LoadingOperationType;
  getConvenioLabel: (convenioId?: string | null) => string;
  updatePrestacao: (
    index: number,
    field: keyof PrestacaoConta,
    value: string | boolean | number | null
  ) => void;
  handleUploadPrestacao: (e: ChangeEvent<HTMLInputElement>, index: number) => Promise<void>;
  salvarBloco: (index: number) => Promise<void>;
  excluirBloco: (id: string, index: number) => Promise<void>;
};

const styles = {
  recordHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  } as CSSProperties,
  recordTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "#f8fafc",
  } as CSSProperties,
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
  } as CSSProperties,
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
  } as CSSProperties,
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  } as CSSProperties,
  fieldWrap: {
    display: "grid",
    gap: 6,
  } as CSSProperties,
  label: {
    fontSize: "0.93rem",
    fontWeight: 700,
    color: "#e2e8f0",
  } as CSSProperties,
  full: {
    gridColumn: "1 / -1",
  } as CSSProperties,
  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#e5e7eb",
    fontWeight: 700,
  } as CSSProperties,
  blockMsg: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#e2e8f0",
    fontWeight: 700,
    fontSize: "0.92rem",
  } as CSSProperties,
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

export default function PrestacaoCard({
  item,
  index,
  convenios,
  blockMsgs,
  loadingIndex,
  loadingOperationType,
  getConvenioLabel,
  updatePrestacao,
  handleUploadPrestacao,
  salvarBloco,
  excluirBloco,
}: Props) {
  return (
    <AdminCard>
      <div style={styles.recordHeader}>
        <div>
          <h3 style={styles.recordTitle}>Prestação #{index + 1}</h3>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={item.publicado ? styles.badge : styles.badgeMuted}>
              {item.publicado ? "Publicado" : "Oculto"}
            </span>

            <span style={styles.badgeMuted}>
              {item.convenio_id ? getConvenioLabel(item.convenio_id) : "Sem convênio vinculado"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <AdminButton
            type="button"
            variant="danger"
            className={classes.redBtn}
            onClick={async () => {
              if (!item.id) {
                alert("Salve antes de excluir.");
                return;
              }

              await excluirBloco(item.id, index);
            }}
            disabled={loadingIndex === index && loadingOperationType === "delete"}
            style={{
              opacity: loadingIndex === index && loadingOperationType === "delete" ? 0.6 : 1,
              cursor: loadingIndex === index && loadingOperationType === "delete" ? "not-allowed" : "pointer",
            }}
          >
            {loadingIndex === index && loadingOperationType === "delete" ? "Excluindo..." : "Excluir"}
          </AdminButton>
        </div>
      </div>

      <div style={styles.grid2}>
        <div style={styles.fieldWrap}>
          <label style={styles.label}>Convênio vinculado</label>
          <AdminSelect
            className={classes.select}
            value={item.convenio_id || ""}
            onChange={(e) => updatePrestacao(index, "convenio_id", e.target.value)}
          >
            <option value="">Selecione</option>
            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {[
                  convenio.titulo || "Sem título",
                  convenio.numero_instrumento ? `Nº ${convenio.numero_instrumento}` : null,
                  convenio.tipo_instrumento || null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Ordem</label>
          <AdminInput
            className={classes.input}
            type="number"
            value={item.ordem ?? 0}
            onChange={(e) => updatePrestacao(index, "ordem", Number(e.target.value))}
          />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Fase da prestação</label>
          <AdminSelect
            className={classes.select}
            value={item.fase_prestacao || ""}
            onChange={(e) => updatePrestacao(index, "fase_prestacao", e.target.value)}
          >
            {FASE_OPTIONS.map((option) => (
              <option key={option || "empty-fase"} value={option}>
                {option || "Selecione"}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Status da prestação</label>
          <AdminSelect
            className={classes.select}
            value={item.status_prestacao || ""}
            onChange={(e) => updatePrestacao(index, "status_prestacao", e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || "empty-status"} value={option}>
                {option || "Selecione"}
              </option>
            ))}
          </AdminSelect>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Tipo de documento</label>
          <TipoDocumentoField
            value={item.tipo_documento || ""}
            onChange={(v) => updatePrestacao(index, "tipo_documento", v)}
            para="prestacao"
            valueMode="label"
            emptyOption="Selecione"
            extraOptions={TIPO_DOCUMENTO_OPTIONS.filter(Boolean).map((label) => ({
              codigo: label
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_"),
              label,
            }))}
            createDefaults={{
              para_publicacao: false,
              para_emissao: false,
              para_prestacao: true,
              criar_modelo: false,
            }}
          />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Título do documento</label>
          <AdminInput
            className={classes.input}
            value={item.documento_titulo || ""}
            onChange={(e) => updatePrestacao(index, "documento_titulo", e.target.value)}
            placeholder="Ex.: Relatório técnico parcial — 1º trimestre"
          />
        </div>

        <div style={{ ...styles.fieldWrap, ...styles.full }}>
          <label style={styles.label}>Documento - Arquivo</label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <AdminFileInput
              accept="application/pdf"
              className={classes.input}
              onChange={(e) => handleUploadPrestacao(e, index)}
            />

            {item.documento_url && (
              <a
                href={item.documento_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#22c55e",
                  color: "#052814",
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                📄 Ver documento
              </a>
            )}

            {item.documento_url && (
              <AdminButton
                type="button"
                variant="danger"
                className={classes.redBtn}
                onClick={() => updatePrestacao(index, "documento_url", null)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontWeight: 700,
                }}
              >
                Remover
              </AdminButton>
            )}
          </div>
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Referência inicial</label>
          <AdminInput
            className={classes.input}
            type="date"
            value={item.referencia_inicio || ""}
            onChange={(e) => updatePrestacao(index, "referencia_inicio", e.target.value)}
          />
        </div>

        <div style={styles.fieldWrap}>
          <label style={styles.label}>Referência final</label>
          <AdminInput
            className={classes.input}
            type="date"
            value={item.referencia_fim || ""}
            onChange={(e) => updatePrestacao(index, "referencia_fim", e.target.value)}
          />
        </div>

        <div style={{ ...styles.fieldWrap, ...styles.full }}>
          <label style={styles.label}>Observações</label>
          <AdminTextarea
            className={classes.textarea}
            value={item.observacoes || ""}
            onChange={(e) => updatePrestacao(index, "observacoes", e.target.value)}
            placeholder="Informações complementares sobre a execução, análise, aprovação ou encerramento."
          />
        </div>
      </div>

      <div className={classes.footer}>
        <label style={styles.switchRow}>
          <AdminInput
            type="checkbox"
            checked={item.publicado ?? false}
            onChange={(e) => updatePrestacao(index, "publicado", e.target.checked)}
          />
          Publicado
        </label>

        <AdminButton
          type="button"
          variant="primary"
          className={classes.greenBtn}
          style={{
            opacity: loadingIndex === index && loadingOperationType === "save" ? 0.6 : 1,
            cursor: loadingIndex === index && loadingOperationType === "save" ? "not-allowed" : "pointer",
          }}
          onClick={() => salvarBloco(index)}
          disabled={loadingIndex === index && loadingOperationType === "save"}
        >
          {loadingIndex === index && loadingOperationType === "save" ? "Salvando..." : "Salvar este bloco"}
        </AdminButton>
      </div>

      {blockMsgs[index] ? <AdminMessage message={blockMsgs[index]} type={getMessageType(blockMsgs[index])} style={styles.blockMsg} /> : null}
    </AdminCard>
  );
}
