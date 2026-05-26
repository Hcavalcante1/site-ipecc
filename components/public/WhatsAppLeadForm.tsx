"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  PUBLIC_WHATSAPP_SUBJECT_OPTIONS,
  buildWhatsAppUrlFromLead,
  validateWhatsAppLeadForm,
  type WhatsAppLeadFormFields,
} from "@/lib/whatsapp/publicWhatsApp";
import styles from "./WhatsAppLeadForm.module.css";

const EMPTY_FORM: WhatsAppLeadFormFields = {
  nome: "",
  organizacao: "",
  telefone: "",
  email: "",
  assunto: "",
  mensagem: "",
};

type WhatsAppLeadFormProps = {
  onSuccess?: () => void;
  initialAssunto?: string;
};

function WhatsAppSubmitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 0 1 0 14c-1.2 0-2.3-.3-3.3-.8l-.3-.2-2.7.7.7-2.6-.2-.3A7 7 0 0 1 12 5Zm-2 3.1c-.2 0-.4.1-.6.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1 2.4.2.4 1.4 2.3 3.4 3.1 2 .8 2 .6 2.4.6.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.7-.3l-1.2-.6c-.2-.1-.4-.1-.6.1l-.5.7c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.8-1.2-.7-.6-1.1-1.4-1.2-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.1-.2.2-.3.1-.2.1-.3 0-.4l-.6-1.4c-.2-.4-.3-.4-.5-.4Z" />
    </svg>
  );
}

export default function WhatsAppLeadForm({
  onSuccess,
  initialAssunto = "",
}: WhatsAppLeadFormProps) {
  const formId = useId();
  const nomeRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<WhatsAppLeadFormFields>(() => ({
    ...EMPTY_FORM,
    assunto: initialAssunto,
  }));
  const [errors, setErrors] = useState<
    Partial<Record<keyof WhatsAppLeadFormFields, string>>
  >({});
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...EMPTY_FORM,
      assunto: initialAssunto,
      nome: prev.nome,
      organizacao: prev.organizacao,
      telefone: prev.telefone,
      email: prev.email,
      mensagem: prev.mensagem,
    }));
    setErrors({});
    setShowAlert(false);
  }, [initialAssunto]);

  useEffect(() => {
    const t = window.setTimeout(() => nomeRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [initialAssunto]);

  const updateField = useCallback(
    (field: keyof WhatsAppLeadFormFields, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
      setShowAlert(false);
    },
    []
  );

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = validateWhatsAppLeadForm(form);
    setErrors(result.errors);
    setShowAlert(!result.ok);

    if (!result.ok) return;

    try {
      await fetch("/api/public/whatsapp-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pagina_origem: window.location.pathname,
          user_agent: navigator.userAgent,
        }),
      });
    } catch {
      /* persistência opcional — não bloqueia wa.me */
    }

    const url = buildWhatsAppUrlFromLead(form);
    window.open(url, "_blank", "noopener,noreferrer");
    setForm(EMPTY_FORM);
    setErrors({});
    setShowAlert(false);
    onSuccess?.();
  };

  const inputClass = (field: keyof WhatsAppLeadFormFields) =>
    errors[field] ? `${styles.input} ${styles.inputError}` : styles.input;

  const selectClass = errors.assunto
    ? `${styles.select} ${styles.inputError}`
    : styles.select;

  return (
    <form
      id={formId}
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className={styles.body}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-nome`}>
            Nome <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            ref={nomeRef}
            id={`${formId}-nome`}
            name="nome"
            type="text"
            autoComplete="name"
            className={inputClass("nome")}
            value={form.nome}
            onChange={(e) => updateField("nome", e.target.value)}
            aria-invalid={Boolean(errors.nome)}
            aria-describedby={errors.nome ? `${formId}-nome-err` : undefined}
          />
          {errors.nome ? (
            <p id={`${formId}-nome-err`} className={styles.fieldError}>
              {errors.nome}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-org`}>
            Organização / Empresa / Entidade
          </label>
          <input
            id={`${formId}-org`}
            name="organizacao"
            type="text"
            autoComplete="organization"
            className={styles.input}
            value={form.organizacao}
            onChange={(e) => updateField("organizacao", e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-tel`}>
            Telefone <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-tel`}
            name="telefone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            className={inputClass("telefone")}
            value={form.telefone}
            onChange={(e) => updateField("telefone", e.target.value)}
            aria-invalid={Boolean(errors.telefone)}
            aria-describedby={
              errors.telefone ? `${formId}-tel-err` : undefined
            }
          />
          {errors.telefone ? (
            <p id={`${formId}-tel-err`} className={styles.fieldError}>
              {errors.telefone}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-email`}>
            E-mail
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className={inputClass("email")}
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? `${formId}-email-err` : undefined
            }
          />
          {errors.email ? (
            <p id={`${formId}-email-err`} className={styles.fieldError}>
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-assunto`}>
            Assunto <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <select
            id={`${formId}-assunto`}
            name="assunto"
            className={selectClass}
            value={form.assunto}
            onChange={(e) => updateField("assunto", e.target.value)}
            aria-invalid={Boolean(errors.assunto)}
            aria-describedby={
              errors.assunto ? `${formId}-assunto-err` : undefined
            }
          >
            <option value="">Selecione…</option>
            {PUBLIC_WHATSAPP_SUBJECT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.assunto ? (
            <p id={`${formId}-assunto-err`} className={styles.fieldError}>
              {errors.assunto}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${formId}-msg`}>
            Mensagem breve
          </label>
          <textarea
            id={`${formId}-msg`}
            name="mensagem"
            rows={3}
            className={styles.textarea}
            value={form.mensagem}
            onChange={(e) => updateField("mensagem", e.target.value)}
            placeholder="Opcional — descreva brevemente sua demanda"
          />
        </div>
      </div>

      {showAlert ? (
        <p className={styles.alert} role="status">
          Preencha os campos obrigatórios antes de continuar.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submitBtn}>
          <WhatsAppSubmitIcon />
          Continuar no WhatsApp
        </button>
      </div>
    </form>
  );
}
