import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "./http";

export function seal(data: object): string {
  const secret = process.env.PLAN_BINDING_SECRET;
  if (!secret || secret.length < 32) throw new AppError("EXECUTION_NOT_CONFIGURED", 503);
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${encoded}.${createHmac("sha256", secret).update(encoded).digest("base64url")}`;
}
export function unseal(token: string): unknown {
  const secret = process.env.PLAN_BINDING_SECRET;
  if (!secret || secret.length < 32) throw new AppError("EXECUTION_NOT_CONFIGURED", 503);
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra) throw new AppError("INVALID_PREVIEW");
  const expected = createHmac("sha256", secret).update(encoded).digest();
  const received = Buffer.from(signature, "base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected, received))
    throw new AppError("INVALID_PREVIEW");
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch {
    throw new AppError("INVALID_PREVIEW");
  }
}
