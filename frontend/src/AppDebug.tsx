import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { NavigationRail } from './components/NavigationRail';
import { AnalyticsDashboardSimple } from './components/analytics/AnalyticsDashboardSimple';

function Dashboard() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>('missions');

  console.log('Dashboard render - currentView:', currentView);
  console.log('Dashboard render - user:', user);

  const renderMainContent = () => {
    console.log('Rendering view:', currentView);
    
    switch (currentView) {
      case 'analytics':
        return (
          <div className="p-6 bg-white min-h-screen">
            <h1 className="text-2xl font-bold text-black mb-4">Analytics View Active</h1>
            <AnalyticsDashboardSimple />
          </div>
        );
      case 'missions':
      default:
        return (
          <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold text-black mb-4">Missions View Active</h1>
            <div className="bg-white p-4 rounded shadow">
              <p className="text-black">This is the missions view. Click Analytics in the navigation to test the analytics dashboard.</p>
              <p className="text-sm text-gray-600 mt-2">Current user: {user?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-600">Current view: {currentView}</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white overflow-hidden">
      <NavigationRail activeItem={currentView} onNavigate={setCurrentView} />
      <div className="ml-[60px]">
        {renderMainContent()}
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('AppContent render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <Dashboard />;
}

function AppDebug() {
  console.log('AppDebug render');
  
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default AppDebug;