# AIMOPS API Documentation

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### Data Ingestion

#### Upload Data
- **POST** `/ingestion/upload`
- **Description**: Upload data file for processing
- **Request Body**:
  ```json
  {
    "file": "multipart/form-data",
    "source_type": "string"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data_source_id": "integer",
    "message": "string"
  }
  ```

### Forecasting

#### Generate Forecast
- **POST** `/forecasting/predict`
- **Description**: Generate forecast based on historical data
- **Request Body**:
  ```json
  {
    "data_source_id": "integer",
    "forecast_period": "integer"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "predictions": [
      {
        "date": "string",
        "value": "float",
        "confidence_interval": "float"
      }
    ]
  }
  ```

### NLP / Sentiment Analysis

#### Analyze Sentiment
- **POST** `/nlp/sentiment`
- **Description**: Analyze sentiment of text data
- **Request Body**:
  ```json
  {
    "text": "string"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "sentiment": "string",
    "score": "float"
  }
  ```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "status": "error",
  "message": "string",
  "code": "integer"
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error
