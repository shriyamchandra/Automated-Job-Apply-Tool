import { NextResponse } from 'next/server';
import { parseApplications } from '@/lib/parsers/applications';
import { parsePipelineFile } from '@/lib/parsers/pipeline';
import { DashboardStats } from '@/lib/types';

export async function GET() {
  try {
    const apps = parseApplications();
    const pipeline = parsePipelineFile();
    
    const stats: DashboardStats = {
      totalApplications: apps.length,
      avgScore: apps.length > 0 ? 
        apps.reduce((acc, app) => acc + (app.score || 0), 0) / apps.length : 0,
      pendingPipeline: pipeline.filter(i => !i.processed).length,
      processedPipeline: pipeline.filter(i => i.processed).length,
      statusCounts: apps.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
    
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
