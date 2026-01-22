import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';

// Pages
import Login from '../features/auth/pages/Login';
import Dashboard from '../features/dashboard/pages/Dashboard';
import CampaignList from '../features/campaigns/pages/CampaignList';
// ... other imports

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { index: true, element: <Login /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> }
    ]
  },
  {
    path: '/dashboard',
    element: <MainLayout />, // ← Has sidebar
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'campaigns', element: <CampaignList /> },
      { path: 'campaigns/:id', element: <CampaignDetail /> },
      { path: 'data-upload', element: <DataUpload /> },
      { path: 'forecasting', element: <Forecasting /> },
      { path: 'feedback', element: <Feedback /> },
      { path: 'events', element: <Events /> },
      { path: 'reports', element: <Reports /> },
      { path: 'admin', element: <Admin /> }
    ]
  }
]);