export const createSignature = async (dataString: string): Promise<string> => {
  const secretKey = process.env.URL_LOCKER_KEY;
  const hasher = new Bun.CryptoHasher("sha256", secretKey);
  hasher.update(dataString);
  const fullHexSignature = hasher.digest("hex");
  return fullHexSignature.substring(0, 8);
};
