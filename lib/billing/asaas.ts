const PRODUCTION_BASE = "https://api.asaas.com/v3";
const SANDBOX_BASE = "https://sandbox.asaas.com/api/v3";

function baseUrl(): string {
  return process.env.ASAAS_ENV === "sandbox" ? SANDBOX_BASE : PRODUCTION_BASE;
}

export function asaasConfigurado(): boolean {
  return Boolean(String(process.env.ASAAS_API_KEY || "").trim());
}

async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = String(process.env.ASAAS_API_KEY || "").trim();
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada.");

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.description ||
      json?.message ||
      `Asaas respondeu ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export type AsaasCustomer = { id: string };
export type AsaasSubscription = { id: string; status: string };
export type AsaasPayment = {
  id: string;
  invoiceUrl: string;
  status: string;
  billingType: string;
  subscription?: string;
};

export async function criarClienteAsaas(opts: {
  name: string;
  email: string;
  cpfCnpj: string;
  externalReference: string;
}): Promise<AsaasCustomer> {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: opts.name,
      email: opts.email,
      cpfCnpj: opts.cpfCnpj.replace(/\D/g, ""),
      externalReference: opts.externalReference,
    }),
  });
}

export async function criarAssinaturaAsaas(opts: {
  customer: string;
  value: number;
  description: string;
  externalReference: string;
  nextDueDate: string;
  cycle?: string;
  billingType?: string;
}): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: opts.customer,
      billingType: opts.billingType ?? "UNDEFINED",
      value: opts.value,
      cycle: opts.cycle ?? "MONTHLY",
      nextDueDate: opts.nextDueDate,
      description: opts.description,
      externalReference: opts.externalReference,
    }),
  });
}

export async function listarPagamentosDaAssinatura(
  subscriptionId: string
): Promise<{ data: AsaasPayment[] }> {
  return asaasRequest(`/subscriptions/${subscriptionId}/payments?sort=dateCreated&order=desc`);
}

export async function cancelarAssinaturaAsaas(subscriptionId: string): Promise<void> {
  await asaasRequest(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
