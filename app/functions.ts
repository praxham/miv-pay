import crypto from "node:crypto";

export const createSignature = async (dataString: string): Promise<string> => {
  const secretKey = process.env.URL_LOCKER_KEY || "";

  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(dataString);
  const fullHexSignature = hmac.digest("hex");

  return fullHexSignature.substring(0, 8);
};
