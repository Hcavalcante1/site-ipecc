import type {
  SignatureAuthorizeInput,
  SignatureAuthorizeResult,
  SignatureBatchSignInput,
  SignatureBatchSignResult,
  SignatureProvider,
  SignatureSignInput,
  SignatureSignResult,
  SignatureStatusResult,
  SignatureVerifyInput,
  SignatureVerifyResult,
} from "./SignatureProvider";
import { IPECC_PROVIDER_CODE } from "../signing/constants";
import { ipeccConfigurado } from "../signing/ipeccSignService";
import { sha256Bytes } from "../signing/evidenceService";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { GD_STORAGE_BUCKET } from "../types";

/**
 * Provedor nativo IPECC.
 * O fluxo real (senha + OTP + carimbo) vive em signing/ipeccSignService.
 */
export class IpeccProvider implements SignatureProvider {
  readonly code = IPECC_PROVIDER_CODE;
  readonly name = "Assinatura Eletrônica IPECC";

  async authorize(
    _input: SignatureAuthorizeInput
  ): Promise<SignatureAuthorizeResult> {
    throw new Error(
      "O motor IPECC não usa OAuth. Use o fluxo senha + OTP no admin."
    );
  }

  async sign(input: SignatureSignInput): Promise<SignatureSignResult> {
    return {
      externalId: input.documentId,
      signedStoragePath: input.storagePath,
      signedHash: input.fileHashSha256,
      status: "pending_internal_flow",
    };
  }

  async batchSign(
    input: SignatureBatchSignInput
  ): Promise<SignatureBatchSignResult> {
    return {
      externalSessionId: input.batchId,
      items: input.items.map((item) => ({
        documentId: item.documentId,
        status: "pending_internal_flow",
      })),
    };
  }

  async verify(input: SignatureVerifyInput): Promise<SignatureVerifyResult> {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(GD_STORAGE_BUCKET)
      .download(input.signedStoragePath);
    if (error || !data) {
      return { valid: false, detail: error?.message || "Arquivo ausente." };
    }
    const buf = Buffer.from(await data.arrayBuffer());
    const hash = sha256Bytes(buf);
    if (input.expectedHash && input.expectedHash !== hash) {
      return { valid: false, detail: "Hash divergente." };
    }
    return { valid: true, detail: hash };
  }

  async cancel(externalId: string): Promise<SignatureStatusResult> {
    return { status: "cancelled", detail: externalId };
  }

  async status(externalId: string): Promise<SignatureStatusResult> {
    return { status: "ready", detail: externalId };
  }
}

export { ipeccConfigurado };
