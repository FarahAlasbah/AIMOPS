# AIMOPS Backend

## Overview
This is the backend service for the AIMOPS project, handling data ingestion, forecasting, and NLP analysis.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python run.py
   ```

## Project Structure

- `app/models/` - Database models
- `app/routes/` - API endpoints
- `app/services/` - Business logic
  - `ingestion/` - Data upload & mapping
  - `forecasting/` - ML models
  - `nlp/` - Sentiment analysis
- `app/utils/` - Helper functions
- `app/config.py` - Configuration settings
- `tests/` - Test suite
