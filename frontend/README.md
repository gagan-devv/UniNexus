# UniNexus Frontend

A modern React frontend for the UniNexus campus event discovery platform.

## Features

- **Authentication System**: Complete login/register with JWT token management
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Protected Routes**: Route-based authentication and authorization
- **Modern UI**: Clean, intuitive interface with Lucide React icons
- **API Integration**: Full integration with UniNexus backend API

## Tech Stack

- **React 19** - Frontend framework
- **Vite** - Build tool and dev server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **Lucide React** - Modern icon library

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- UniNexus backend running on port 3000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components (LoadingSpinner, ProtectedRoute)
│   └── layout/         # Layout components (Navbar, Layout)
├── context/            # React Context providers
│   └── AuthContext.jsx # Authentication context
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   └── Home.jsx       # Home page
├── services/          # API services
│   └── api.js         # API client and endpoints
├── App.jsx            # Main app component
└── main.jsx          # App entry point
```

## Features Implemented

### Authentication
- ✅ User registration with validation
- ✅ User login with JWT tokens
- ✅ Token refresh mechanism
- ✅ Protected routes
- ✅ Logout functionality

### UI Components
- ✅ Responsive navigation bar
- ✅ Loading states and spinners
- ✅ Form validation and error handling
- ✅ Password strength indicator
- ✅ Modern card-based layouts

### Pages
- ✅ Home page with stats and featured content
- ✅ Login page with form validation
- ✅ Register page with comprehensive validation
- ✅ 404 error page
- 🚧 Events page (placeholder)
- 🚧 Clubs page (placeholder)
- 🚧 Profile page (placeholder)

## API Integration

The frontend integrates with the UniNexus backend API:

- **Authentication**: Login, register, logout, token refresh
- **Events**: CRUD operations for events
- **Clubs**: CRUD operations for club profiles
- **RSVPs**: Event RSVP management
- **Users**: Profile management

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:3000/api
BACKEND_PORT=3000
```

## Development Notes

- The app uses React Context for state management
- API calls include automatic token refresh
- All forms include comprehensive validation
- Responsive design works on mobile and desktop
- Loading states are implemented throughout

## Next Steps

1. Implement remaining pages (Events, Clubs, Profile)
2. Add real-time notifications
3. Implement advanced search and filtering
4. Add image upload functionality
5. Implement comment/discussion system
6. Add PWA capabilities