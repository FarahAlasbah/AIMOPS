import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Import pages
import Overview from './features/dashboard/pages/Overview';
import CampaignList from './features/campaigns/pages/CampaignList';
import NewCampaign from './features/campaigns/pages/NewCampaign';
import DataUpload from './features/data-upload/pages/DataUpload';
import FeedbackList from './features/feedback/pages/FeedbackList'; // Add
import FeedbackUpload from './features/feedback/pages/FeedbackUpload'; // Add

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/overview" replace />} />
        
        <Route path="/admin" element={<MainLayout userRole="Admin" />}>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          
          <Route path="overview" element={<Overview />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="campaigns/new" element={<NewCampaign />} />
          <Route path="feedback" element={<FeedbackList />} /> {/* Add */}
          <Route path="feedback/upload" element={<FeedbackUpload />} /> {/* Add */}
          <Route path="data-upload" element={<DataUpload />} />
          <Route path="audit" element={<div><h2>Audit & Data Quality</h2></div>} />
          <Route path="data-sources" element={<div><h2>Data Sources</h2></div>} />
          <Route path="reports" element={<div><h2>Reports</h2></div>} />
          <Route path="settings" element={<div><h2>Settings</h2></div>} />
          <Route path="support" element={<div><h2>Support</h2></div>} />
        </Route>

        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;