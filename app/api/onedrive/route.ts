import { CATEGORIAS, conectado, conectar, desconectar } from "../../onedrive";

export async function GET() {
  return Response.json({ conectado: conectado(), categorias: CATEGORIAS.map(({ pasta, rotulo }) => ({ pasta, rotulo })) });
}

// Recebe o código que o "rclone authorize onedrive" mostrou no PC do dono.
export async function POST(request: Request) {
  const form = await request.formData();
  try {
    const nome = await conectar(String(form.get("codigo") ?? ""));
    return redirect(`ok=${encodeURIComponent(nome)}`);
  } catch (e) {
    return redirect(`erro=${encodeURIComponent((e as Error).message.slice(0, 300))}`);
  }
}

export async function DELETE() {
  desconectar();
  return Response.json({ ok: true });
}

function redirect(q: string) {
  return new Response(null, { status: 303, headers: { Location: `/onedrive?${q}` } });
}
