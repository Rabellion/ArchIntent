# API Documentation

## Base URL
```
http://127.0.0.1:5000
```

## Authentication
Currently, no authentication is required (Phase 3). Authentication will be added in Phase 5 for Laravel integration.

---

## Endpoints

### 1. Health Check

Get service status and version information.

**Endpoint**: `GET /`

**Request**: No parameters required

**Response**:
```json
{
  "service": "ArchIntent AI Microservice",
  "status": "running",
  "version": "1.0"
}
```

**Status Codes**:
- `200 OK`: Service is running

**Example**:
```bash
curl http://127.0.0.1:5000/
```

---

### 2. Analyze Intent

Analyze client request and return matched professionals.

**Endpoint**: `POST /api/v1/analyze-intent`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "text": "Natural language description of client needs"
}
```

**Request Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | Yes | Client's natural language request describing their project needs |

**Response**:
```json
{
  "status": "success",
  "decoded_intent": {
    "style": "string",
    "size": "string",
    "extracted_keywords": ["string"]
  },
  "recommended_professionals": [
    {
      "id": "integer",
      "name": "string",
      "match_score": "float",
      "style_tags": ["string"],
      "portfolio_highlight": "string"
    }
  ]
}
```

**Response Fields**:

**decoded_intent**:
| Field | Type | Description |
|-------|------|-------------|
| style | string | Detected architectural style (Modern, Classic, Industrial, Eco-friendly, Unknown) |
| size | string | Detected project size (Small, Standard, Large) |
| extracted_keywords | array | List of relevant keywords extracted from the request |

**recommended_professionals**:
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Professional's unique identifier |
| name | string | Professional's name |
| match_score | float | Similarity score (0.0 to 1.0), higher is better |
| style_tags | array | Professional's specialization tags |
| portfolio_highlight | string | Notable project from portfolio |

**Status Codes**:
- `200 OK`: Successfully analyzed request
- `400 Bad Request`: Missing or invalid 'text' field
- `500 Internal Server Error`: Server-side processing error

**Example Requests**:

**1. Modern Home Request**:
```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d '{"text": "I want a spacious modern home with lots of natural light"}'
```

**Response**:
```json
{
  "status": "success",
  "decoded_intent": {
    "style": "Modern",
    "size": "Large (1 Kanal+)",
    "extracted_keywords": ["spacious", "modern", "natural", "light"]
  },
  "recommended_professionals": [
    {
      "id": 1,
      "name": "Alice Sterling",
      "match_score": 0.9243,
      "style_tags": ["Modern", "Minimalist", "Sustainable"],
      "portfolio_highlight": "Glass House in the Hills"
    },
    {
      "id": 4,
      "name": "Dana Eco",
      "match_score": 0.6421,
      "style_tags": ["Eco-friendly", "Bamboo", "Modern"],
      "portfolio_highlight": "Green Roof Complex"
    }
  ]
}
```

**2. Classic Style Request**:
```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d '{"text": "Looking for someone who can design a classic colonial style house"}'
```

**Response**:
```json
{
  "status": "success",
  "decoded_intent": {
    "style": "Classic",
    "size": "Standard",
    "extracted_keywords": ["looking", "someone", "design", "classic", "colonial", "style", "house"]
  },
  "recommended_professionals": [
    {
      "id": 2,
      "name": "Bob Builder",
      "match_score": 0.9156,
      "style_tags": ["Classic", "Colonial", "Brick"],
      "portfolio_highlight": "Heritage Manor Restoration"
    }
  ]
}
```

**3. Sustainable/Eco Request**:
```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d '{"text": "Need an eco-friendly sustainable design for small property"}'
```

**Response**:
```json
{
  "status": "success",
  "decoded_intent": {
    "style": "Eco-friendly",
    "size": "Small (5-10 Marla)",
    "extracted_keywords": ["eco-friendly", "sustainable", "design", "small", "property"]
  },
  "recommended_professionals": [
    {
      "id": 4,
      "name": "Dana Eco",
      "match_score": 0.9312,
      "style_tags": ["Eco-friendly", "Bamboo", "Modern"],
      "portfolio_highlight": "Green Roof Complex"
    }
  ]
}
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error description"
}
```

### Common Errors

**Missing 'text' field**:
```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d '{}'
```

**Response** (400):
```json
{
  "error": "Missing 'text' field in payload"
}
```

**Invalid JSON**:
```bash
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d 'invalid json'
```

**Response** (400 or 500):
```json
{
  "error": "Error message describing the issue"
}
```

---

## Rate Limiting

**Current**: No rate limiting (Phase 3)

**Planned** (Phase 4+):
- 100 requests per minute per IP
- 1000 requests per hour per API key
- Rate limit headers in response

---

## Versioning

API version is included in the URL path: `/api/v1/...`

Future versions will maintain backward compatibility or use a new version path (e.g., `/api/v2/...`).

---

## Integration Examples

### Python
```python
import requests

url = "http://127.0.0.1:5000/api/v1/analyze-intent"
payload = {
    "text": "I want a modern sustainable home"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print(f"Status: {data['status']}")
print(f"Style: {data['decoded_intent']['style']}")
print(f"Top Match: {data['recommended_professionals'][0]['name']}")
```

### JavaScript (Node.js)
```javascript
const axios = require('axios');

const analyzeIntent = async (text) => {
  try {
    const response = await axios.post(
      'http://127.0.0.1:5000/api/v1/analyze-intent',
      { text },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    console.log('Status:', response.data.status);
    console.log('Style:', response.data.decoded_intent.style);
    console.log('Top Match:', response.data.recommended_professionals[0].name);
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
};

analyzeIntent('I want a spacious modern home');
```

### PHP (Laravel)
```php
use Illuminate\Support\Facades\Http;

$response = Http::post('http://127.0.0.1:5000/api/v1/analyze-intent', [
    'text' => 'I want a modern sustainable home'
]);

if ($response->successful()) {
    $data = $response->json();
    
    echo "Status: " . $data['status'] . "\n";
    echo "Style: " . $data['decoded_intent']['style'] . "\n";
    echo "Top Match: " . $data['recommended_professionals'][0]['name'] . "\n";
} else {
    echo "Error: " . $response->body() . "\n";
}
```

---

## Testing

### Interactive Testing
Use the provided interactive tester:
```bash
python interactive_tester.py
```

### Automated Testing
Run the test suite:
```bash
python test_service.py
```

---

## Future Endpoints (Planned)

### `/api/v1/batch-analyze`
Process multiple requests in a single call.

### `/api/v1/professional/{id}/similar`
Find professionals similar to a given professional.

### `/health`
Detailed health check with system metrics.

### `/metrics`
Performance and usage metrics for monitoring.

---

## Support

For issues or questions:
- Check the [README.md](README.md) for setup instructions
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Review [TASKS.md](TASKS.md) for development roadmap
