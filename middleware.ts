// middleware.ts
import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

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
    // If the user is logged in and trying to access the home page, redirect to dashboard
    if (auth.userId && req.nextUrl.pathname === '/') {
      // Check if the user is a barber (using type assertion for metadata)
      const metadata = auth.sessionClaims?.metadata as { role?: string } || {};
      const isBarber = metadata.role === 'barber';
      
      // Redirect to appropriate dashboard based on role
      const redirectUrl = isBarber 
        ? new URL('/barbers/dashboard', req.url)
        : new URL('/appointments', req.url);
        
      return NextResponse.redirect(redirectUrl);
    }
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