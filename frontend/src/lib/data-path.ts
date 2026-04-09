import path from 'path';

/**
 * Resolves paths to Career-Ops data files relative to the project root.
 * frontend/ is at the root. backend/ is at the root.
 */

// process.cwd() is /Users/shriyamchandra/career-ops/frontend
const PROJECT_ROOT = path.resolve(/* turbopackIgnore: true */ process.cwd(), '..');
const BACKEND_ROOT = path.join(PROJECT_ROOT, 'backend');

export function dataPath(relativePath: string): string {
  return path.join(BACKEND_ROOT, relativePath);
}

export function applicationsPath(): string {
  return dataPath('data/applications.md');
}

export function pipelinePath(): string {
  return dataPath('data/pipeline.md');
}

export function scanHistoryPath(): string {
  return dataPath('data/scan-history.tsv');
}

export function reportsDir(): string {
  return dataPath('reports');
}

export function reportPath(slug: string): string {
  return path.join(reportsDir(), `${slug}.md`);
}
