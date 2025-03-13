// middleware.ts
import { authMiddleware } from '@clerk/nextjs';

// Define public routes that do not require authentication
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-in/(.*)',
  '/sign-up',
  '/sign-up/(.*)',
  '/api/clerk',
  '/api/clerk/(.*)'
];

// Define admin-only routes
const adminRoutes = [
  '/barbers/create',
  '/barbers/create/(.*)',
  '/admin',
  '/admin/(.*)'
];

export default authMiddleware({
  publicRoutes,
  afterAuth(auth, req, evt) {
    // Handle authentication and redirects
    const isPublic = publicRoutes.some(route => {
      if (route.includes('*')) {
        const baseRoute = route.replace('(.*)', '');
        return req.nextUrl.pathname.startsWith(baseRoute);
      }
      return req.nextUrl.pathname === route;
    });

    // For admin routes, allow the actual pages to handle authorization
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