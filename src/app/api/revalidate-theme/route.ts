import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidation-secret');
  const expectedSecret = process.env.REVALIDATION_SECRET;
  
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Secret required' }, { status: 500 });
  }
  
  if (!secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const a = Buffer.from(expectedSecret);
  const b = Buffer.from(secret);
  
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  revalidateTag('theme');
  return NextResponse.json({ revalidated: true });
}
