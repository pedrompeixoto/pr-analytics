import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Session } from "@/types";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db
    .prepare(`SELECT * FROM sessions WHERE id = ?`)
    .get(id) as Session | undefined;

  if (!existing) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (existing.stopped_at) {
    return NextResponse.json({ error: "Session already stopped" }, { status: 400 });
  }

  const stoppedAt = new Date().toISOString();
  const durationMs =
    new Date(stoppedAt).getTime() - new Date(existing.started_at).getTime();

  const session = db
    .prepare(
      `UPDATE sessions
       SET stopped_at = ?, duration_ms = ?
       WHERE id = ?
       RETURNING *`
    )
    .get(stoppedAt, durationMs, id) as Session;

  return NextResponse.json(session);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);

  return new NextResponse(null, { status: 204 });
}
