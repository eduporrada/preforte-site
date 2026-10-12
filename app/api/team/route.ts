import { ensureDatabase } from "../../../db/runtime";

export const runtime = "edge";

export async function GET() {
  const db = await ensureDatabase();
  const result = await db
    .prepare("SELECT id, name, email, role, status, created_at FROM team_members ORDER BY created_at DESC")
    .all();
  return Response.json(
    result.results.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      createdAt: member.created_at,
    })),
  );
}

export async function POST(request: Request) {
  const db = await ensureDatabase();
  const body = (await request.json()) as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "Projetos e obras").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "E-mail inválido." }, { status: 400 });
  }
  await db
    .prepare(`INSERT INTO team_members (id, name, email, role, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role, status = 'pending'`)
    .bind(crypto.randomUUID(), name, email, role, new Date().toISOString())
    .run();
  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const db = await ensureDatabase();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Membro não informado." }, { status: 400 });
  await db.prepare("DELETE FROM team_members WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
