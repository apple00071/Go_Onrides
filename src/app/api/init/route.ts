import { NextResponse } from 'next/server';
import { initializeServices } from '@/lib/init';

// Initialize services when this route is called
initializeServices().catch(console.error);

export async function GET() {
  return NextResponse.json({ status: 'Services initialized' });
} 