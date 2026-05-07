# Chavruta Match

A web platform for connecting Jewish study partners (chavrutim) to learn and discuss Jewish texts together.

## About

Chavruta Match helps people find study partners to engage in chavruta, the traditional Talmudic paired learning method. Users can create profiles, specify what they want to study, set their availability and preferred learning medium, and connect with other learners in their region.

## Features

- **User Authentication** - Email-based sign-up and authentication with NextAuth.js
- **Study Profiles** - Create and manage multiple study profiles ("tentacles") for different subjects and time slots
- **Subject Selection** - Choose from various Jewish texts:
  - Chumash (Torah)
  - Tanach (Hebrew Bible)
  - Mishna
  - Gemora (Talmud)
  - Daf Yomi (daily Talmud page)
  - Chassidus (Hasidic teachings)
  - Halacha (Jewish law)
  - Dirshu (structured learning program)
- **Regional Matching** - Find partners in your region with timezone awareness
- **Learning Methods** - Support for in-person, phone calls, video calls, or flexible arrangements
- **Connections & Messaging** - Send connection requests, accept/decline offers, and message with your study partners
- **User Profiles** - Include name, bio, gender, synagogue affiliation, and location
- **Waitlist** - Geolocation-based waitlist for regions not yet available

## Tech Stack

- **Framework** - Next.js 16 with React 19
- **Database** - PostgreSQL with Drizzle ORM
- **Authentication** - NextAuth.js v5 (Beta)
- **Styling** - Tailwind CSS v4
- **Form Handling** - React Hook Form with Zod validation
- **UI Components** - Base UI + shadcn components
- **Animations** - Framer Motion
- **Email** - Resend for transactional emails
- **File Uploads** - UploadThing
- **Location Services** - MaxMind GeoIP2
- **Notifications** - Sonner toast library

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chavruta-match
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Fill in required environment variables including database URL, auth secrets, and API keys.

4. Set up the database:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database

The app uses Drizzle ORM with PostgreSQL. Key tables include:

- **users** - User accounts and profiles
- **tentacles** - Individual study profiles with subject, timing, and medium
- **connections** - Connection requests between users
- **messages** - Direct messages between connected users
- **regions** - Geographic regions with timezone info
- **synagogues** - Synagogue directory
- **sessions** & **accounts** - NextAuth.js authentication

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed initial data
- `npm run db:reset` - Reset database

## Project Structure

```
app/
├── (app)/           # Authenticated app routes
├── (auth)/          # Authentication routes
└── page.tsx         # Home page

drizzle/            # Database schema and migrations
public/             # Static assets
```
