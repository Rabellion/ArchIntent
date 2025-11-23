# ArchIntent AI Microservice - Architecture Documentation

## System Overview

The ArchIntent AI Microservice is responsible for analyzing natural language client requests and matching them with suitable architecture professionals through semantic analysis.

## Technology Stack

### Core Framework
- **Flask**: Lightweight Python web framework
- **Python 3.x**: Primary programming language

### AI/ML Libraries (Phase 4)
- **SpaCy**: Natural Language Processing for entity extraction
- **sentence-transformers (S-BERT)**: Semantic similarity matching
- **NumPy**: Vector operations for similarity calculations

### Current Implementation (Phase 3)
- Mock implementations using rule-based logic
- Simple keyword matching
- Random score variation for demonstration

## Architecture Diagram

```
┌─────────────────┐
│  Laravel API    │
│   (Frontend)    │
└────────┬────────┘
         │
         │ HTTP POST /api/v1/analyze-intent
         │
         ▼
┌─────────────────────────────────────┐
│   ArchIntent AI Microservice        │
│   (Flask - Port 5000)               │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  API Layer                   │  │
│  │  - Request validation        │  │
│  │  - Error handling            │  │
│  │  - Response formatting       │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  Intent Decoder              │  │
│  │  - Keyword Extraction        │  │
│  │  - Entity Recognition        │  │
│  │  - Intent Classification     │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  Semantic Matcher            │  │
│  │  - Similarity Calculation    │  │
│  │  - Ranking Algorithm         │  │
│  │  - Score Normalization       │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│             ▼                       │
│  ┌──────────────────────────────┐  │
│  │  Data Layer                  │  │
│  │  - Mock Architect Profiles   │  │
│  │  - (Future: Vector DB)       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Component Details

### 1. API Layer
**File**: `ai_microservice.py`

**Responsibilities**:
- Accept HTTP POST requests
- Validate incoming JSON payload
- Handle errors and exceptions
- Format and return responses

**Endpoints**:
- `GET /` - Health check and service info
- `POST /api/v1/analyze-intent` - Main analysis endpoint

### 2. Intent Decoder
**Function**: `mock_extract_keywords()`

**Current Implementation**:
- Rule-based keyword extraction
- Simple pattern matching for styles and sizes
- Returns structured intent data

**Phase 4 Enhancement**:
```python
# Future implementation using SpaCy
def extract_keywords_spacy(text):
    nlp = spacy.load("en_core_web_lg")
    doc = nlp(text)
    
    entities = {
        "style": [],
        "size": [],
        "features": [],
        "budget": []
    }
    
    # Extract named entities
    for ent in doc.ents:
        if ent.label_ == "STYLE":
            entities["style"].append(ent.text)
        # ... more entity types
    
    return entities
```

### 3. Semantic Matcher
**Function**: `mock_calculate_similarity()`

**Current Implementation**:
- Simple tag matching
- Base score + style match bonus
- Random variation for demonstration

**Phase 4 Enhancement**:
```python
# Future implementation using S-BERT
from sentence_transformers import SentenceTransformer
import numpy as np

def calculate_similarity_sbert(client_text, professional_portfolios):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Generate embeddings
    client_embedding = model.encode(client_text)
    
    results = []
    for prof in professional_portfolios:
        prof_embedding = model.encode(prof["description"])
        
        # Cosine similarity
        similarity = np.dot(client_embedding, prof_embedding) / (
            np.linalg.norm(client_embedding) * np.linalg.norm(prof_embedding)
        )
        
        results.append({
            **prof,
            "match_score": float(similarity)
        })
    
    return sorted(results, key=lambda x: x["match_score"], reverse=True)
```

### 4. Data Layer
**Current**: In-memory mock data (`MOCK_ARCHITECTS`)

**Future Options**:
- PostgreSQL for professional profiles
- Redis for caching embeddings
- Vector database (Pinecone, Weaviate) for semantic search

## Data Flow

```
1. Client Request
   └─> "I want a spacious modern home"

2. Intent Decoding
   └─> {
         "style": "Modern",
         "size": "Large (1 Kanal+)",
         "keywords": ["spacious", "modern"]
       }

3. Semantic Matching
   └─> For each professional:
       - Calculate similarity score
       - Apply ranking heuristics
       - Sort by score

4. Response
   └─> {
         "decoded_intent": {...},
         "recommended_professionals": [...]
       }
```

## API Contract

### Request Format
```json
{
  "text": "Natural language client request"
}
```

### Response Format
```json
{
  "status": "success",
  "decoded_intent": {
    "extracted_keywords": ["keyword1", "keyword2"],
    "size": "Size category",
    "style": "Style preference"
  },
  "recommended_professionals": [
    {
      "id": 1,
      "name": "Professional Name",
      "match_score": 0.92,
      "style_tags": ["tag1", "tag2"],
      "portfolio_highlight": "Notable project"
    }
  ]
}
```

## Scalability Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Load balancer can distribute requests
- No session management required

### Caching Strategy
- Cache embeddings for professionals (rarely change)
- Cache popular client queries (with TTL)
- Use Redis for distributed caching

### Performance Optimization
- Batch embedding generation
- Pre-compute professional embeddings
- Index-based similarity search for large datasets
- Async processing for non-critical operations

## Security

### Current
- Basic error handling
- JSON validation

### Planned
- API key authentication
- Rate limiting (Flask-Limiter)
- Input sanitization
- CORS configuration
- Request logging and monitoring
- DDoS protection

## Monitoring & Observability

### Metrics to Track
- Request count and latency
- Error rates
- Model inference time
- Cache hit rates
- Professional match distribution

### Logging
- Request/response logging
- Error tracking
- Performance metrics
- Audit trail for Laravel integration

## Future Enhancements

1. **Multi-language Support**: Support for Urdu and other regional languages
2. **Context Awareness**: Remember previous client interactions
3. **Feedback Loop**: Learn from client selections to improve matching
4. **Advanced Filtering**: Budget, location, timeline constraints
5. **Explainability**: Provide reasons for professional recommendations
