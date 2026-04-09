import { NextResponse } from 'next/server';
import { parsePipelineFile } from '@/lib/parsers/pipeline';

export async function GET() {
  try {
    const items = parsePipelineFile();
    return NextResponse.json({
      pending: items.filter(i => !i.processed),
      processed: items.filter(i => i.processed)
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
