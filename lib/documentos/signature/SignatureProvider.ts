/**
 * Interface comum para provedores de assinatura eletrônica.
 * Implementações: Documento (padrão ente privado), GovBr (órgãos públicos), futuros ICP/Clicksign etc.
 */

export type SignatureAuthorizeInput = {
  redirectUri: string;
  state?: string;
  scopes?: string[];
};

export type SignatureAuthorizeResult = {
  authorizationUrl: string;
  state: string;
};

export type SignatureSignInput = {
  documentId: string;
  storagePath: string;
  fileHashSha256: string;
  accessToken: string;
  sessionId?: string;
};

export type SignatureSignResult = {
  externalId: string;
  signedStoragePath?: string;
  signedHash?: string;
  status: string;
};

export type SignatureBatchSignInput = {
  batchId: string;
  items: Array<{
    documentId: string;
    storagePath: string;
    fileHashSha256: string;
  }>;
  accessToken: string;
  sessionId?: string;
};

export type SignatureBatchSignResult = {
  externalSessionId?: string;
  items: Array<{
    documentId: string;
    status: string;
    error?: string;
  }>;
};

export type SignatureVerifyInput = {
  signedStoragePath: string;
  expectedHash?: string;
};

export type SignatureVerifyResult = {
  valid: boolean;
  detail?: string;
};

export type SignatureStatusResult = {
  status: string;
  detail?: string;
};

export interface SignatureProvider {
  readonly code: string;
  readonly name: string;
  authorize(input: SignatureAuthorizeInput): Promise<SignatureAuthorizeResult>;
  sign(input: SignatureSignInput): Promise<SignatureSignResult>;
  batchSign(input: SignatureBatchSignInput): Promise<SignatureBatchSignResult>;
  verify(input: SignatureVerifyInput): Promise<SignatureVerifyResult>;
  cancel(externalId: string): Promise<SignatureStatusResult>;
  status(externalId: string): Promise<SignatureStatusResult>;
}
