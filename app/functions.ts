import crypto from "node:crypto";

export const createSignature = async (dataString: string): Promise<string> => {
  const secretKey = process.env.URL_LOCKER_KEY || "";

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(dataString);
  const fullHexSignature = hmac.digest("hex");

  return fullHexSignature.substring(0, 8);
};

export const readableAmount = (rawAmount: string): string => {
  if (!rawAmount || isNaN(Number(rawAmount))) return rawAmount;

  // 'en-IN' automatically formats with the Indian numbering system (1,00,000)
  return new Intl.NumberFormat("en-IN").format(Number(rawAmount));
};
