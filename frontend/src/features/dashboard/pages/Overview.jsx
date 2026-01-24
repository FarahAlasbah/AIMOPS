import { Card, PageHeader } from '../../../shared/components';
import './Overview.css';

const Overview = () => {
  return (
    <div className="overview-page">
      <PageHeader 
        title="Overview"
        subtitle="Dashboard overview of your campaigns and performance"
      />

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Campaigns</h3>
          <p className="stat-number">12</p>
          <span className="stat-change positive">+2 this month</span>
        </div>
        
        <div className="stat-card">
          <h3>Active Forecasts</h3>
          <p className="stat-number">5</p>
          <span className="stat-change">Running</span>
        </div>
        
        <div className="stat-card">
          <h3>Feedback Items</h3>
          <p className="stat-number">248</p>
          <span className="stat-change positive">+32 new</span>
        </div>
        
        <div className="stat-card">
          <h3>Data Quality</h3>
          <p className="stat-number">94%</p>
          <span className="stat-change positive">Excellent</span>
        </div>
      </div>

      {/* Recent Activity Card */}
      <Card title="Recent Activity">
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">📊</div>
            <div className="activity-content">
              <p className="activity-title">New forecast completed</p>
              <p className="activity-time">2 hours ago</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">📢</div>
            <div className="activity-content">
              <p className="activity-title">Campaign "Summer Sale" launched</p>
              <p className="activity-time">5 hours ago</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon">💬</div>
            <div className="activity-content">
              <p className="activity-title">48 new feedback entries analyzed</p>
              <p className="activity-time">1 day ago</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Campaign Performance Card */}
      <Card title="Campaign Performance" subtitle="Last 30 days">
        <div className="performance-placeholder">
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
            📈 Chart visualization will be displayed here
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Overview;