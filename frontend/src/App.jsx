import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import './App.css';

// Lazy load page components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Events = lazy(() => import('./pages/Events'));
const Clubs = lazy(() => import('./pages/Clubs'));
const Profile = lazy(() => import('./pages/Profile'));
const Discover = lazy(() => import('./pages/Discover'));
const Trending = lazy(() => import('./pages/Trending'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const MyClub = lazy(() => import('./pages/MyClub'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const ClubDetails = lazy(() => import('./pages/ClubDetails'));

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SidebarProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <LoadingSpinner size="lg" />
            </div>
          }>
            <Routes>
              {/* Modern Login Route - Full Screen */}
              <Route 
                path="/login" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Login />
                  </ProtectedRoute>
                } 
              />
              
              {/* Modern Register Route - Full Screen */}
              <Route 
                path="/register" 
                element={
                  <ProtectedRoute requireAuth={false}>
                    <Register />
                  </ProtectedRoute>
                } 
              />
              
              {/* All other routes with Layout */}
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    
                    {/* Protected Routes */}
                    <Route 
                      path="/events" 
                      element={
                        <ProtectedRoute>
                          <Events />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/clubs" 
                      element={
                        <ProtectedRoute>
                          <Clubs />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/my-rsvps" 
                      element={
                        <ProtectedRoute>
                          <div className="p-4 sm:p-6 lg:p-8">
                            <div className="text-center py-12">
                              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My RSVPs Page</h1>
                              <p className="text-gray-600 dark:text-gray-400 mt-2">Coming soon...</p>
                            </div>
                          </div>
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/discover" 
                      element={
                        <ProtectedRoute>
                          <Discover />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/trending" 
                      element={
                        <ProtectedRoute>
                          <Trending />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/notifications" 
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/messages" 
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/messages/:conversationId" 
                      element={
                        <ProtectedRoute>
                          <Messages />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/my-club" 
                      element={
                        <ProtectedRoute>
                          <MyClub />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/events/:id" 
                      element={
                        <ProtectedRoute>
                          <EventDetails />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/clubs/:id" 
                      element={
                        <ProtectedRoute>
                          <ClubDetails />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* 404 Route */}
                    <Route 
                      path="*" 
                      element={
                        <div className="p-4 sm:p-6 lg:p-8">
                          <div className="text-center py-12">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                            <p className="text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
                            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                              Go back home
                            </a>
                          </div>
                        </div>
                      } 
                    />
                  </Routes>
                </Layout>
              } />
            </Routes>
          </Suspense>
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;