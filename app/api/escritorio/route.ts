import { lerEscritorio } from "../../escritorio-dados";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await lerEscritorio(), { headers: { "Cache-Control": "no-store" } });
}
