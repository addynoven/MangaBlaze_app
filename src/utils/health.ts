/**
 * Utility to report the health/performance of a manga source extension.
 */
export async function reportSourceHealth(sourceId: string, success: boolean, latency: number, error?: string) {
  try {
    // Fire and forget - don't let health reporting block the UI
    fetch('/api/source/health/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, success, latency, error })
    }).catch(() => {});
  } catch (e) {
    // Fail silently
  }
}

/**
 * Higher-order function to wrap a fetch call with health reporting.
 */
export async function monitoredFetch(sourceId: string, url: string) {
  const start = Date.now();
  try {
    const response = await fetch(url);
    const latency = Date.now() - start;
    
    if (!response.ok) {
      reportSourceHealth(sourceId, false, latency, `HTTP Error: ${response.status}`);
    } else {
      // Success is reported by the component after checking if data exists
    }
    
    return response;
  } catch (error: unknown) {
    const latency = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    reportSourceHealth(sourceId, false, latency, message);
    throw error;
  }
}
