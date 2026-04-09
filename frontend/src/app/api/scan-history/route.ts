import { NextResponse } from 'next/server';
import { parseScanHistoryFile } from '@/lib/parsers/scan-history';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    
    let entries = parseScanHistoryFile();
    if (statusFilter) {
      entries = entries.filter(e => e.status === statusFilter);
    }
    
    return NextResponse.json({ entries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
