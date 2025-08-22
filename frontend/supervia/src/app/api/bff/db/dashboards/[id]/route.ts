import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

function verify(req: Request): { ok: boolean; status: number } {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) return { ok: false, status: 401 };
  try { jwt.verify(token, process.env.JWT_SECRET as string); return { ok: true, status: 200 }; }
  catch { return { ok: false, status: 403 }; }
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const upstream = await fetch(`${process.env.DB_SERVICE_URL}/api/dashboards/${id}`, {
    headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY as string }
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const auth = verify(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  const payload = await req.json();
  const upstream = await fetch(`${process.env.DB_SERVICE_URL}/api/dashboards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY as string },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const upstream = await fetch(`${process.env.DB_SERVICE_URL}/api/dashboards/${id}`, {
    method: 'DELETE',
    headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY as string }
  });
  return NextResponse.json(null, { status: upstream.status });
}


