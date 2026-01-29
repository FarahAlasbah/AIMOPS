// frontend/src/features/campaigns/pages/CampaignList.jsx
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "../../../shared/components";
import { useAuth } from "../../../shared/contexts/AuthContext";
import "./CampaignList.css";

const CampaignList = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission("campaigns.create");
  const canUpdate = hasPermission("campaigns.update");
  const canDelete = hasPermission("campaigns.delete");

  // Sample campaign data
  const campaigns = [
    {
      id: 1,
      name: "Summer Sale 2025",
      status: "Active",
      budget: "$10,000",
      startDate: "2025-06-01",
      endDate: "2025-08-31",
    },
    {
      id: 2,
      name: "Ramadan Special",
      status: "Planned",
      budget: "$15,000",
      startDate: "2025-03-10",
      endDate: "2025-04-09",
    },
    {
      id: 3,
      name: "Back to School",
      status: "Completed",
      budget: "$8,000",
      startDate: "2024-08-01",
      endDate: "2024-09-15",
    },
  ];

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "status-active";
      case "Planned":
        return "status-planned";
      case "Completed":
        return "status-completed";
      default:
        return "";
    }
  };

  const onView = (campaignId) => {
    // If you have a view page later, navigate there
    // navigate(`/app/campaigns/${campaignId}`);
    console.log("View campaign:", campaignId);
  };

  const onEdit = (campaignId) => {
    // If you have an edit page later, navigate there
    // navigate(`/app/campaigns/${campaignId}/edit`);
    console.log("Edit campaign:", campaignId);
  };

  const onDelete = (campaignId) => {
    console.log("Delete campaign:", campaignId);
  };

  return (
    <div className="campaign-list-page">
      <PageHeader
        title="Campaigns"
        subtitle="Manage your marketing campaigns"
        actions={
          canCreate ? (
            <button
              onClick={() => navigate("/app/campaigns/new")}
              className="btn-primary"
            >
              + New Campaign
            </button>
          ) : null
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
                    <span
                      className={`status-badge ${getStatusClass(
                        campaign.status
                      )}`}
                    >
                      {campaign.status}
                    </span>
                  </td>

                  <td>{campaign.budget}</td>
                  <td>{campaign.startDate}</td>
                  <td>{campaign.endDate}</td>

                  <td>
                    <div className="campaign-actions">
                      <button
                        className="btn-action"
                        onClick={() => onView(campaign.id)}
                      >
                        View
                      </button>

                      {canUpdate && (
                        <button
                          className="btn-action"
                          onClick={() => onEdit(campaign.id)}
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="btn-action btn-danger"
                          onClick={() => onDelete(campaign.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {campaigns.length === 0 && (
            <div className="empty-state">
              <p>No campaigns yet.</p>

              {canCreate ? (
                <button
                  onClick={() => navigate("/app/campaigns/new")}
                  className="btn-primary"
                >
                  + New Campaign
                </button>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CampaignList;
