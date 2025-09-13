import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OTP verification is disabled. This endpoint now always returns success
// without consuming the incoming request body to avoid locking the stream.
export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'OTP verification bypassed.'
  });
}
