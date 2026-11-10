/**
 * Node ESM resolution hook to resolve 'next/server' to 'next/server.js'
 * Allows running frontend/middleware.ts directly in Node without bundling.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return nextResolve('next/server.js', context);
  }
  return nextResolve(specifier, context);
}
