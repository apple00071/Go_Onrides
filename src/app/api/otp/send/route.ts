import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OTP sending is disabled. This endpoint is a no-op and always returns success
// without reading or touching the incoming request body.
export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'OTP is disabled. Verification is bypassed.',
    request_id: 'bypass'
  });
}
