# Credit Card Generator Application

## Overview

This is a full-stack credit card generator application built with React and Express. The application allows users to generate valid credit card numbers using the Luhn algorithm, with customizable parameters like BIN (Bank Identification Number), expiration dates, and CCV codes. It features a modern UI built with shadcn/ui components and Tailwind CSS, providing a clean and professional interface for generating test credit card data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **State Management**: React Hook Form for form handling with Zod validation
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite with ESBuild for fast development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with a single endpoint for card generation
- **Validation**: Zod schemas for request/response validation
- **Algorithm**: Custom Luhn algorithm implementation for valid credit card number generation
- **Random Generation**: Polynomial Random Number Generator for deterministic randomness

### Database Architecture
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: PostgreSQL (via Neon serverless)
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`
- **Migrations**: Drizzle Kit for database migrations stored in `/migrations`
- **Note**: Currently uses in-memory storage for user data, with database infrastructure ready for future expansion

### Development Tools
- **Monorepo Structure**: Client and server code organized in separate directories with shared types
- **Type Safety**: Full TypeScript coverage across frontend, backend, and shared schemas
- **Development Server**: Vite dev server with HMR and Express API integration
- **Build Process**: Separate build steps for client (Vite) and server (ESBuild)

### Authentication & Session Management
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **User Management**: Basic user storage interface implemented (currently in-memory)
- **Security**: CORS configuration and request logging middleware

### Card Generation Logic
- **Algorithm**: Luhn algorithm implementation for generating valid card numbers
- **BIN Support**: Flexible BIN (Bank Identification Number) input from 6-16 digits
- **Customization**: Optional month, year, and CCV generation
- **Validation**: Server-side validation using Zod schemas
- **Quantity Control**: Batch generation up to 100 cards per request

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **drizzle-orm**: Type-safe SQL query builder and ORM
- **express**: Node.js web application framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management

### UI and Styling Dependencies
- **@radix-ui/***: Comprehensive set of UI primitives for accessible components
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for creating variant-based component APIs
- **clsx**: Utility for constructing className strings
- **lucide-react**: Icon library

### Form and Validation Dependencies
- **react-hook-form**: Forms library with validation
- **@hookform/resolvers**: Validation resolvers for react-hook-form
- **zod**: TypeScript-first schema validation

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **eslint**: Code linting
- **prettier**: Code formatting
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tools

### Session and Database Dependencies
- **connect-pg-simple**: PostgreSQL session store for Express
- **drizzle-kit**: Database migrations and introspection tool