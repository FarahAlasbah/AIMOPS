import { useNavigate } from 'react-router-dom';
import { Card, PageHeader } from '../../../shared/components';
import './CampaignList.css';

const CampaignList = () => {
  const navigate = useNavigate();

  // Sample campaign data
  const campaigns = [
    { id: 1, name: 'Summer Sale 2025', status: 'Active', budget: '$10,000', startDate: '2025-06-01', endDate: '2025-08-31' },
    { id: 2, name: 'Ramadan Special', status: 'Planned', budget: '$15,000', startDate: '2025-03-10', endDate: '2025-04-09' },
    { id: 3, name: 'Back to School', status: 'Completed', budget: '$8,000', startDate: '2024-08-01', endDate: '2024-09-15' },
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case 'Active': return 'status-active';
      case 'Planned': return 'status-planned';
      case 'Completed': return 'status-completed';
      default: return '';
    }
  };

  return (
    <div className="campaign-list-page">
      <PageHeader 
        title="Campaigns"
        subtitle="Manage your marketing campaigns"
        actions={
          <button 
            onClick={() => navigate('/admin/campaigns/new')}
            className="btn-primary"
          >
            + New Campaign
          </button>
        }
      />

      <Card>
        <div className="campaigns-table-wrapper">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="campaign-name">{campaign.name}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td>{campaign.budget}</td>
                  <td>{campaign.startDate}</td>
                  <td>{campaign.endDate}</td>
                  <td>
                    <button className="btn-action">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="empty-state">
              <p>No campaigns yet. Create your first campaign!</p>
              <button 
                onClick={() => navigate('/admin/campaigns/new')}
                className="btn-primary"
              >
                + New Campaign
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CampaignList;