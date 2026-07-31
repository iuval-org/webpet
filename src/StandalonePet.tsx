/**
 * Standalone Pet Page — redirects to the full dashboard + mascot demo.
 */
export default function StandalonePet() {
  // Redirect to the standalone HTML page which has the complete demo
  window.location.href = '/standalone.html' + window.location.search + window.location.hash
  return null
}