import { generateLinkHandler } from "../src/handlers";

export async function POST(req: Request) {
  return generateLinkHandler(req);
}
