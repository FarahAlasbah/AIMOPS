import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  PageHeader,
  FormSection,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCalendar, // Imported new component
  FormRow,
  FormActions,
  Button
} from '../../../shared/components';

const NewCampaign = () => {
  const navigate = useNavigate();
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    channels: '',
    products: '',
    event: ''
  });

  // Error State
  const [errors, setErrors] = useState({});

  // Date Validation Logic
  const validateDateRange = (start, end) => {
    if (start && end) {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      
      if (endDateObj < startDateObj) {
        return "End date cannot be before start date";
      }
    }
    return null;
  };

  const handleChange = (field) => (e) => {
    const newValue = e.target.value;
    
    // Update form data
    const updatedFormData = { ...formData, [field]: newValue };
    setFormData(updatedFormData);

    // Clear generic field error if it exists
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }

    // Specific Date Validation Logic
    if (field === 'startDate' || field === 'endDate') {
      const start = field === 'startDate' ? newValue : formData.startDate;
      const end = field === 'endDate' ? newValue : formData.endDate;
      
      const dateError = validateDateRange(start, end);
      
      // If there is an error, set it on the endDate field
      // If error is resolved, clear it
      setErrors(prev => ({
        ...prev,
        endDate: dateError
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Final validation before submit
    const dateError = validateDateRange(formData.startDate, formData.endDate);
    if (dateError) {
      setErrors(prev => ({ ...prev, endDate: dateError }));
      return; // Stop submission
    }

    console.log('Campaign data:', formData);
    // Proceed with API call...
  };

  const breadcrumbs = [
  { label: 'Campaigns', link: true, onClick: () => navigate('/app/campaigns') },
  { label: 'New campaigns', link: false }
];

  const budgetOptions = [
    { value: '0-5000', label: '$0 - $5,000' },
    { value: '5000-10000', label: '$5,000 - $10,000' },
    { value: '10000-25000', label: '$10,000 - $25,000' },
    { value: '25000+', label: '$25,000+' }
  ];

  const channelOptions = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google', label: 'Google Ads' },
    { value: 'email', label: 'Email Marketing' },
    { value: 'in-store', label: 'In-Store' }
  ];

  const eventOptions = [
    { value: 'ramadan', label: 'Ramadan' },
    { value: 'eid', label: 'Eid' },
    { value: 'black-friday', label: 'Black Friday' },
    { value: 'christmas', label: 'Christmas' }
  ];

  return (
    <div className="new-campaign-page">
      <PageHeader 
        breadcrumbs={breadcrumbs}
        title="New campaigns"
      />

      <Card>
        <form onSubmit={handleSubmit}>
          {/* Campaign Details */}
          <FormSection title="Campaign details">
            <FormInput
              label="Campaign Name"
              placeholder="Enter campaign name"
              value={formData.name}
              onChange={handleChange('name')}
              required
            />

            <FormTextarea
              label="Short Description"
              placeholder="Enter campaign description"
              value={formData.description}
              onChange={handleChange('description')}
              rows={4}
            />
          </FormSection>

          {/* Schedule */}
          <FormSection title="Schedule">
            <FormRow columns={2}>
              <FormCalendar
                label="Start date"
                value={formData.startDate}
                onChange={handleChange('startDate')}
                required
                // Optional: set min date to today
                // min={new Date().toISOString().split('T')[0]}
              />

              <FormCalendar
                label="End date"
                value={formData.endDate}
                onChange={handleChange('endDate')}
                required
                min={formData.startDate} // Helps prevent user from picking wrong date in UI
                error={errors.endDate}   // Displays the error message
              />
            </FormRow>
          </FormSection>

          {/* Budget & Channels */}
          <FormSection title="Budget & Channels">
            <FormSelect
              label="Budget"
              placeholder="Select budget range"
              options={budgetOptions}
              value={formData.budget}
              onChange={handleChange('budget')}
              required
            />

            <FormSelect
              label="Marketing Channels"
              placeholder="Select channel"
              options={channelOptions}
              value={formData.channels}
              onChange={handleChange('channels')}
              required
            />
          </FormSection>

          {/* Target Products */}
          <FormSection title="Target Products">
            <FormInput
              label="Select Products"
              placeholder="🔍 Search Products"
              value={formData.products}
              onChange={handleChange('products')}
            />
          </FormSection>

          {/* Linked Events */}
          <FormSection title="Linked Events" optional>
            <FormSelect
              label="Event"
              placeholder="None"
              options={eventOptions}
              value={formData.event}
              onChange={handleChange('event')}
            />
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <Button
              variant="secondary"
              onClick={() => navigate('/app/campaigns')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!!errors.endDate} // Disable button if there is a date error
            >
              Create Campaign
            </Button>
          </FormActions>
        </form>
      </Card>
    </div>
  );
};

export default NewCampaign;