import { ogHandler } from "../src/handlers";

export function GET(req: Request) {
  return ogHandler(req);
}
