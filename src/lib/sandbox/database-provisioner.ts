/**
 * Database provisioning for Agent mode.
 * Supports Neon (serverless PostgreSQL) via their API.
 * Falls back to a connection string template if no API key is configured.
 */

interface ProvisionResult {
  connectionString: string
  host: string
  database: string
  provider: 'neon' | 'mock'
}

/**
 * Provision a new database for a project.
 * If NEON_API_KEY is set, creates a real Neon project.
 * Otherwise returns a mock connection string.
 */
export async function provisionDatabase(
  projectName: string
): Promise<ProvisionResult> {
  const neonApiKey = process.env.NEON_API_KEY

  if (neonApiKey) {
    return provisionNeonDatabase(neonApiKey, projectName)
  }

  // Mock fallback — return a template connection string
  return {
    connectionString: `postgresql://user:password@localhost:5432/${sanitizeName(projectName)}`,
    host: 'localhost:5432',
    database: sanitizeName(projectName),
    provider: 'mock',
  }
}

async function provisionNeonDatabase(
  apiKey: string,
  projectName: string
): Promise<ProvisionResult> {
  const response = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      project: {
        name: `atoms-${sanitizeName(projectName)}`,
        pg_version: 16,
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Neon API error: ${response.status} ${text}`)
  }

  const data = await response.json()
  const connectionUri = data.connection_uris?.[0]?.connection_uri

  if (!connectionUri) {
    throw new Error('Neon did not return a connection URI')
  }

  return {
    connectionString: connectionUri,
    host: data.project?.region_id || 'unknown',
    database: data.databases?.[0]?.name || 'neondb',
    provider: 'neon',
  }
}

function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 32)
}

/**
 * Check if database provisioning is available.
 */
export function isDatabaseProvisioningAvailable(): boolean {
  return !!process.env.NEON_API_KEY
}
