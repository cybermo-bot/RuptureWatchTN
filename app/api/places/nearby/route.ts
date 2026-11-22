// Pharmacies open near a position, from the Google Places API. Stub for track C.
//
// Rules (CLAUDE.md rule 13):
// - GOOGLE_PLACES_API_KEY is read here, on the server, and never reaches the browser.
// - Responses are fetched live for each request and returned as they are: never stored,
//   cached, logged or copied, except Google's place IDs. The position in the request is
//   used for this search only and never stored or logged either.
// - Results are shown only on the Google map (PatientMap reports which map is showing).
// - Daily quota caps are set in the Google Cloud console.

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(): Promise<Response> {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return Response.json(
      {
        error: 'places_unavailable',
        message:
          'Google Places is not configured on this server (GOOGLE_PLACES_API_KEY is missing). Use the OpenStreetMap fallback.',
      },
      { status: 503, headers: NO_STORE },
    );
  }
  // Track C: call Places API (New) searchNearby here with the server key and a field mask
  // limited to what the page shows, then return the response without storing it.
  return Response.json(
    { error: 'not_implemented', message: 'The nearby search is not built yet (track C).' },
    { status: 501, headers: NO_STORE },
  );
}
