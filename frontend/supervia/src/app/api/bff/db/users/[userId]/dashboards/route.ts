import { NextResponse } from 'next/server';

export async function GET(_req: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const upstream = await fetch(`${process.env.DB_SERVICE_URL}/api/users/${userId}/dashboards`, {
    headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY as string },
    cache: 'no-store'
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}


