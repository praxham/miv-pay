import { verifyLinkHandler } from "../src/handlers";

export async function POST(req: Request) {
  return verifyLinkHandler(req);
}
