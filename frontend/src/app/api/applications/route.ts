import { NextResponse } from 'next/server';
import { parseApplications } from '@/lib/parsers/applications';
import { updateApplication } from '@/lib/writers/applications';
import { CANONICAL_STATUSES } from '@/lib/types';

export async function GET() {
  try {
    const apps = parseApplications();
    return NextResponse.json({ applications: apps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { number, status, notes } = await req.json();
    
    if (status && !CANONICAL_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    
    const apps = await updateApplication(number, { status, notes });
    return NextResponse.json({ applications: apps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
