# AIMOPS Setup Instructions

## Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn
- SQLite (or your preferred database)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows**: `venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Set up environment variables:
   Create a `.env` file in the backend directory:
   ```
   SECRET_KEY=your-secret-key
   DATABASE_URI=sqlite:///aimops.db
   FLASK_ENV=development
   ```

6. Initialize the database:
   ```bash
   python -c "from app import db; db.create_all()"
   ```

7. Run the backend server:
   ```bash
   python run.py
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend should now be running on `http://localhost:3000` and the backend on `http://localhost:5000`.

## Database Setup

1. Navigate to the database directory:
   ```bash
   cd database
   ```

2. Run the initial schema:
   ```bash
   sqlite3 ../backend/aimops.db < schema.sql
   ```

## Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in the configuration files
2. **Database connection error**: Check your DATABASE_URI in the .env file
3. **Module not found**: Ensure all dependencies are installed

For more help, check the main [README.md](../README.md) or open an issue on GitHub.
