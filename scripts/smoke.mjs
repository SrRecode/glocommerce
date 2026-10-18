const apiBase = (
  process.env.SMOKE_API_BASE_URL ??
  process.env.VITE_API_BASE_URL ??
  "http://localhost:5000/api/v1"
).replace(/\/$/, "")

const checks = [
  { name: "health", path: "/health" },
  { name: "catalogue", path: "/products?limit=1" },
]

let failed = 0

for (const check of checks) {
  const url = `${apiBase}${check.path}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`status ${response.status}`)
    }
    await response.json()
    console.log(`ok   ${check.name}  ${url}`)
  } catch (error) {
    failed += 1
    const message = error instanceof Error ? error.message : String(error)
    console.error(`fail ${check.name}  ${url} - ${message}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${checks.length} checks failed`)
  process.exit(1)
}

console.log(`\nall ${checks.length} checks passed`)
