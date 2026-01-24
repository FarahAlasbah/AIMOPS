import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  PageHeader,
  Button,
  FormSelect
} from '../../../shared/components';
import './FeedbackList.css';

const FeedbackList = () => {
  const navigate = useNavigate();
  const [filterCampaign, setFilterCampaign] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('');

  // Sample feedback data
  const feedbackItems = [
    {
      id: 1,
      campaign: 'Summer Sale 2025',
      comment: 'Great products but delivery was slow',
      sentiment: 'Neutral',
      date: '2025-01-20',
      source: 'Facebook'
    },
    {
      id: 2,
      campaign: 'Ramadan Special',
      comment: 'Excellent service and quality!',
      sentiment: 'Positive',
      date: '2025-01-19',
      source: 'Instagram'
    },
    {
      id: 3,
      campaign: 'Summer Sale 2025',
      comment: 'Product was damaged on arrival',
      sentiment: 'Negative',
      date: '2025-01-18',
      source: 'Google Reviews'
    },
  ];

  const campaignOptions = [
    { value: 'summer-sale', label: 'Summer Sale 2025' },
    { value: 'ramadan', label: 'Ramadan Special' },
    { value: 'back-to-school', label: 'Back to School' }
  ];

  const sentimentOptions = [
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' }
  ];

  const getSentimentClass = (sentiment) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'sentiment-positive';
      case 'negative': return 'sentiment-negative';
      case 'neutral': return 'sentiment-neutral';
      default: return '';
    }
  };

  return (
    <div className="feedback-list-page">
      <PageHeader
        title="Feedback"
        subtitle="View and analyze customer feedback from campaigns"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/admin/feedback/upload')}
          >
            + Upload Feedback
          </Button>
        }
      />

      {/* Filters Card */}
      <Card>
        <div className="feedback-filters">
          <div className="filter-group">
            <FormSelect
              label="Filter by Campaign"
              placeholder="All Campaigns"
              options={campaignOptions}
              value={filterCampaign}
              onChange={(e) => setFilterCampaign(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <FormSelect
              label="Filter by Sentiment"
              placeholder="All Sentiments"
              options={sentimentOptions}
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Statistics Card */}
      <div className="feedback-stats">
        <Card className="stat-card-small">
          <div className="stat-content">
            <h4>Total Feedback</h4>
            <p className="stat-value">248</p>
          </div>
        </Card>
        <Card className="stat-card-small">
          <div className="stat-content">
            <h4>Positive</h4>
            <p className="stat-value positive">156</p>
          </div>
        </Card>
        <Card className="stat-card-small">
          <div className="stat-content">
            <h4>Neutral</h4>
            <p className="stat-value neutral">62</p>
          </div>
        </Card>
        <Card className="stat-card-small">
          <div className="stat-content">
            <h4>Negative</h4>
            <p className="stat-value negative">30</p>
          </div>
        </Card>
      </div>

      {/* Feedback List Card */}
      <Card title="Recent Feedback">
        <div className="feedback-table-wrapper">
          <table className="feedback-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Campaign</th>
                <th>Comment</th>
                <th>Sentiment</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {feedbackItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td className="campaign-name">{item.campaign}</td>
                  <td className="comment-cell">{item.comment}</td>
                  <td>
                    <span className={`sentiment-badge ${getSentimentClass(item.sentiment)}`}>
                      {item.sentiment}
                    </span>
                  </td>
                  <td>{item.source}</td>
                  <td>
                    <button className="btn-action-small">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {feedbackItems.length === 0 && (
            <div className="empty-state">
              <p>No feedback yet. Upload your first feedback data!</p>
              <Button
                variant="primary"
                onClick={() => navigate('/admin/feedback/upload')}
              >
                + Upload Feedback
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FeedbackList;