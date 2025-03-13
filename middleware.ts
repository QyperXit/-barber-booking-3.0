// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that do not require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-in/(.*)',
  '/sign-up',
  '/sign-up/(.*)',
  '/api/clerk',
  '/api/clerk/(.*)'
]);

// Define admin-only routes
const isAdminRoute = createRouteMatcher([
  '/barbers/create',
  '/barbers/create/(.*)',
  '/admin',
  '/admin/(.*)'
]);

// Use clerkMiddleware to protect routes
export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Protect non-public routes
    await auth.protect();
    
    // For admin routes, we'll handle the protection in the page component
  }
});

// Configuration for the middleware
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};