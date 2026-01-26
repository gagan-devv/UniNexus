import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
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
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold">Events Page</h1>
                          <p className="text-gray-600 mt-2">Coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/clubs" 
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold">Clubs Page</h1>
                          <p className="text-gray-600 mt-2">Coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold">Profile Page</h1>
                          <p className="text-gray-600 mt-2">Coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/my-club" 
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold">My Club Page</h1>
                          <p className="text-gray-600 mt-2">Coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/my-rsvps" 
                    element={
                      <ProtectedRoute>
                        <div className="text-center py-12">
                          <h1 className="text-2xl font-bold">My RSVPs Page</h1>
                          <p className="text-gray-600 mt-2">Coming soon...</p>
                        </div>
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* 404 Route */}
                  <Route 
                    path="*" 
                    element={
                      <div className="text-center py-12">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                        <p className="text-gray-600 mb-8">Page not found</p>
                        <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
                          Go back home
                        </a>
                      </div>
                    } 
                  />
                </Routes>
              </Layout>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;