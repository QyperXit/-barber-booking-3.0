// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

// Export the Clerk middleware with default settings
// By default, all routes will be public
export default clerkMiddleware();

// Configure the middleware to run on all routes except static files
export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};