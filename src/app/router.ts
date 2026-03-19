export type Route =
  | { type: 'home' }
  | { type: 'example'; sampleId: string };

export function parseRoute(hash: string): Route {
  if (hash.startsWith('#/examples/')) {
    return { type: 'example', sampleId: hash.slice('#/examples/'.length) };
  }
  return { type: 'home' };
}

export function navigateTo(path: string): void {
  window.location.hash = path;
}
