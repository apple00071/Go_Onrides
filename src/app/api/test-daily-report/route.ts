import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing daily report API...');
    
    // Test the daily report endpoint with proper authentication
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/reports/daily`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    const result = await response.json();
    
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Daily report API test successful',
        result,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Daily report API test failed',
        error: result,
        status: response.status,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Daily report test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test daily report',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
