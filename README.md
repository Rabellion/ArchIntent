# ArchIntent

This is the Python-based AI Microservice for the ArchIntent platform. It is responsible for decoding client requests and matching them with suitable architecture professionals using semantic analysis.

## Overview

- **Framework**: Flask
- **Key Libraries**: `spacy`, `sentence-transformers` (Mocked for Phase 3 initial build)
- **Port**: 5000

## Installation

1.  Navigate to the service directory:
    ```bash
    cd archintent-ai-service
    ```

2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

## Running the Service

Start the Flask application:

```bash
python ai_microservice.py
```

The service will start at `http://127.0.0.1:5000`.

## API Usage

### Endpoint: `POST /api/v1/analyze-intent`

Analyzes a natural language request and returns matched professionals.

**Request Body:**

```json
{
  "text": "I am looking for a spacious modern home with sustainable features."
}
```

**Sample Curl Command:**

```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d "{\"text\": \"I want a spacious modern home\"}"
```

**Response Example:**

```json
{
  "status": "success",
  "decoded_intent": {
    "extracted_keywords": ["spacious", "modern", "home"],
    "size": "Large (1 Kanal+)",
    "style": "Modern"
  },
  "recommended_professionals": [
    {
      "id": 1,
      "match_score": 0.92,
      "name": "Alice Sterling",
      "portfolio_highlight": "Glass House in the Hills",
      "style_tags": ["Modern", "Minimalist", "Sustainable"]
    },
    ...
  ]
}
```

## Future Roadmap (Phase 3 Full Integration)

- Replace `mock_extract_keywords` with actual SpaCy NER model.
- Replace `mock_calculate_similarity` with S-BERT vector embeddings and cosine similarity.
