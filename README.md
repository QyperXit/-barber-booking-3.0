# G|Barbers 3.0 - Beta - Barber Booking Platform

A modern, full-featured barber booking application that allows customers to book appointments with barbers and lets barbers manage their availability, appointments, and payments. This is version 3.0 of the G|Barbers platform, completely rebuilt with the latest technologies.

## Evolution from Previous Versions

This application is the third iteration of the G|Barbers platform, representing a significant technological upgrade:

- **Version 1.0**: Initial concept with basic booking functionality (built with vanilla JavaScript)
- **Version 2.0**: Added user authentication and basic barber management using Next.js, TailwindCSS, Kinde Authentication, and Strapi backend
- **Version 3.0** (Current): Complete rebuild with Next.js 15, Convex backend, Clerk authentication, and Stripe payment processing

## Key Improvements in Version 3.0

- **Modern Tech Stack**: Upgraded from Strapi to Convex for real-time database and serverless functions
- **Enhanced Authentication**: Migrated from Kinde to Clerk for more robust user management
- **Payment Processing**: Added Stripe integration with Connect for barber payments
- **Real-time Updates**: All changes to availability and bookings are reflected instantly
- **Improved Barber Dashboard**: Comprehensive tools for availability management and appointment tracking
- **Responsive Design**: Fully responsive UI built with Shadcn UI components
- **Enhanced Booking System**: Robust synchronization between bookings, appointments, and slot availability

## Features

- **Customer Booking**: Users can browse available barbers, select dates, and book available time slots
- **Barber Dashboard**: Barbers can set their availability, view upcoming appointments, and manage their schedule
- **Payment Processing**: Integrated Stripe payments with barber payouts via Stripe Connect
- **Real-time Updates**: All changes to availability and bookings are reflected in real-time
- **Responsive UI**: Works seamlessly on mobile and desktop devices
- **Automatic Synchronization**: Bookings, appointments, and available slots stay in perfect sync

## Booking System Architecture

The booking system features a sophisticated synchronization mechanism:

- **Direct Relationships**: Bookings and appointments have two-way references for reliable tracking
- **Immediate Slot Reservation**: Slots are marked as booked immediately upon booking initiation
- **Payment Status Synchronization**: Appointment statuses are automatically updated when payments succeed
- **Periodic Sync Job**: A background job runs every 10 minutes to ensure data consistency
- **Enhanced Webhook Handling**: Robust Stripe webhook processing ensures reliable payment status updates

## Real-Time Demo

Check out this GIF demonstration of our real-time updates in action:

![Real-Time Demo](example.gif)

The GIF showcases how changes made by barbers to their availability are instantly reflected in the booking interface, providing a seamless experience for both barbers and customers.

## Coming Soon

We're actively working on additional features and improvements for G|Barbers 3.0:

- **Enhanced Analytics**: Detailed insights for barbers to track business performance
- **Responsive Redesign**: Improved mobile and desktop user experience
- **Notifications**: Automated booking reminders and status updates
- **Advanced Scheduling**: Support for recurring appointments and package bookings
- **Public Deployment**: Production deployment coming soon!

## Tech Stack

- **Frontend**: Next.js 15.2.2 with React 19.0.0
- **Backend**: Convex for database, API, and serverless functions
- **Authentication**: Clerk for user authentication
- **Styling**: Shadcn UI components
- **Payments**: Stripe Connect for payment processing
- **Database**: Convex real-time database with schema relationships

## System Architecture

### Data Model
- **Bookings**: Tracks payment status and links to slots, barbers, users, and appointments
- **Appointments**: Customer-facing representation of bookings with service information
- **Slots**: Time slots that can be booked, with availability and booking status
- **Barbers**: Information about service providers, including Stripe Connect integration
- **Users**: Customer information and authentication details

### Synchronization Flow
1. User initiates booking → Slot marked as temporarily booked
2. Payment processed → Booking status updated to "confirmed" 
3. Appointment status automatically synced to "paid"
4. Barber dashboard refreshes in real-time to show the updated appointment
5. Periodic sync job ensures consistency between all related records

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
