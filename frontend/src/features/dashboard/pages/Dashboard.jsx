const Dashboard = () => {
  return (
    <div>
      <h2>Dashboard Page</h2>
      <p>This is the dashboard where you'll see campaign summaries, forecasts, and feedback.</p>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Total Campaigns</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#3498db' }}>12</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Active Forecasts</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#2ecc71' }}>5</p>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3>Feedback Items</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#e74c3c' }}>248</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;