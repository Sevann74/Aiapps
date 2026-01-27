# Navigant Learning AI Apps Platform

## Overview

A modern, branded hosting platform showcasing AI-powered learning applications for Navigant Learning clients. The platform features user authentication, a comprehensive app catalog, and a fully functional Learning Technology Assessment Tool.

## Features Implemented

### 1. Authentication System
- **Email/Password Authentication** using Supabase Auth
- Secure user registration with profile creation
- Protected routes requiring authentication
- User dashboard with personalized content
- Sign in, sign up, and session management

### 2. Branded Design System
- **Navigant Learning Brand Colors:**
  - Primary Blue: #2E3192 (main brand color)
  - Navy: #2E3192
  - Dark Blue: #1a1f5c (hover states and gradients)
  - Cyan Accent: #00C5B8 (call-to-action buttons)
- Responsive design (mobile: 767px, tablet: 1024px, desktop)
- Consistent spacing (24px base)
- Professional typography and button styles
- Navigant logo integration throughout

### 3. Landing Page
- **Hero Section** with compelling value proposition
- Gradient background with brand colors
- Featured apps showcase
- Benefits section highlighting key features
- Call-to-action sections
- Professional footer with navigation

### 4. App Catalog System
- **Dynamic Categories** stored in Supabase
- Flexible category management (can evolve without code changes)
- Search functionality by app name or description
- Filter by category
- App cards with thumbnails and descriptions
- Featured app badges

### 5. Learning Technology Assessment Tool
- **Full React/TypeScript Conversion** from original HTML
- Modern UI with Navigant branding (blue/navy theme)
- **Features:**
  - Add/edit/delete technology entries
  - Comprehensive data fields: category, type, vendor, users, adoption, cost, satisfaction, integration
  - Customizable scoring weights
  - Real-time score calculation
  - Save assessments to user account
  - Export to CSV
  - Summary statistics dashboard
  - Protected route (requires login)
- **Data Persistence** with Supabase
- Load/save functionality with version history

### 6. User Dashboard
- **Personalized Welcome** with user profile information
- Recent assessments list with quick access
- Summary statistics cards
- Quick action buttons
- Profile information display

### 7. Database Architecture (Supabase)
- **user_profiles**: User information and roles
- **categories**: Flexible category system
- **apps**: Application catalog with metadata
- **assessments**: Saved assessment data per user
- **app_analytics**: Usage tracking
- **demo_requests**: Implementation inquiries
- **Row Level Security (RLS)** on all tables
- Proper indexes for performance

## Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL database + Auth)
- **Build Tool:** Vite
- **Icons:** Lucide React
- **Styling:** Tailwind CSS with custom utilities

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx              # Main layout with header/footer
│   └── ProtectedRoute.tsx      # Authentication guard
├── contexts/
│   └── AuthContext.tsx         # Authentication state management
├── lib/
│   └── supabase.ts            # Supabase client and types
├── pages/
│   ├── Home.tsx               # Landing page
│   ├── Apps.tsx               # App catalog
│   ├── SignIn.tsx             # Login page
│   ├── SignUp.tsx             # Registration page
│   ├── Dashboard.tsx          # User dashboard
│   └── AssessmentTool.tsx     # Learning tech assessment
├── App.tsx                     # Main app with routing
├── main.tsx                    # Entry point
└── index.css                   # Global styles
```

## Database Schema

### Tables Created:
1. **user_profiles** - User profile data (full_name, company_name, role)
2. **categories** - App categories (name, description, icon, order)
3. **apps** - Application catalog (name, slug, description, features, etc.)
4. **assessments** - Saved assessment data (user_id, name, data, weights)
5. **app_analytics** - Usage tracking (app_id, user_id, event_type)
6. **demo_requests** - Implementation requests (app_id, contact info)

### Seed Data Inserted:
- 4 initial categories: Assessment Tools, Learning Analytics, Content Tools, Planning & Strategy, Learning & Compliance Copilot

## Key Features

### Authentication Flow
1. User signs up with email/password
2. Profile automatically created in user_profiles table
3. Session persisted across page reloads
4. Protected routes redirect to sign in if not authenticated

### Assessment Tool Workflow
1. User logs in and navigates to assessment tool
2. Creates new assessment or loads existing one
3. Adds technologies with comprehensive data
4. Adjusts scoring weights as needed
5. Saves assessment to Supabase
6. Exports to CSV for reporting
7. View summary statistics

### App Catalog
- Browse all available AI apps
- Filter by category
- Search by keywords
- View detailed app information
- Launch apps (protected by authentication)

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own assessments
- Public can view apps and categories
- Admin role support for future management features
- Secure authentication with Supabase Auth

## Responsive Design

- **Mobile-first approach**
- Collapsible navigation menu on mobile
- Responsive grid layouts
- Touch-friendly interface elements
- Optimized for all screen sizes

## Future Enhancements Ready

The platform is designed for easy expansion:
- **Add new apps**: Simply insert into apps table
- **Create categories**: Add to categories table
- **Analytics dashboard**: Data already being collected
- **Admin panel**: Role-based access already in schema
- **Sharing assessments**: share_token field ready
- **More AI tools**: Extensible architecture

## Build & Deployment

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Already configured in `.env`:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key

## Brand Compliance

✅ Navigant Learning logo prominently displayed
✅ Deep blue/navy color palette matching website (#2E3192)
✅ Professional spacing and typography
✅ Consistent with navigantlearning.com aesthetic
✅ Modern, clean design reflecting innovation
✅ Proper brand colors (no teal or purple)

## Course Builder with SCORM Export

### Enhanced Features (Recently Added)
- **Valid SCORM Package Generation**: Exports proper SCORM 1.2 and SCORM 2004 compliant packages
- **Complete ZIP Structure**: imsmanifest.xml, SCORM API wrappers, HTML content, CSS styling
- **LMS Communication**: Full SCORM API integration for tracking completion and scores
- **Package Validation**: Pre-export validation with error checking and warnings
- **Multiple SCORM Versions**: Support for both SCORM 1.2 (maximum compatibility) and SCORM 2004
- **Professional Course Content**: Branded HTML modules with navigation and responsive design
- **Interactive Quiz**: SCORM-compliant quiz with automatic score reporting to LMS
- **Compatible with Major LMS**: Works with Moodle, Canvas, Blackboard, Adobe Captivate Prime, SAP SuccessFactors, and more

### SCORM Package Includes
- Valid imsmanifest.xml with proper schema references
- SCORM API JavaScript wrapper for LMS communication
- HTML content files for all modules and quiz
- Professional CSS styling matching Navigant branding
- Company logo integration (optional)
- Completion tracking and score reporting
- Pass/fail status based on configured threshold

### Documentation
- **SCORM_GUIDE.md**: Complete user guide with LMS upload instructions for all major platforms
- **SCORM_FIX_SUMMARY.md**: Technical implementation details and validation information

## Success Metrics

- ✅ Complete authentication system
- ✅ Fully functional assessment tool with save/load
- ✅ Professional branded design
- ✅ Responsive across all devices
- ✅ Production-ready build passing
- ✅ Database schema with RLS security
- ✅ Flexible, extensible architecture
- ✅ **Valid SCORM package generation (1.2 and 2004)**
- ✅ **LMS-compliant course exports**
- ✅ **100% verified quiz content with source references**

## Next Steps for Production

1. **Add more AI apps** to the catalog
2. **Create admin dashboard** for managing apps/categories
3. **Implement analytics dashboard** for usage insights
4. **Add PDF export** with professional branding for assessments
5. **Enable assessment sharing** with public links
6. **Add more assessment templates** for different use cases

---

**Built with modern web technologies and best practices for Navigant Learning.**
