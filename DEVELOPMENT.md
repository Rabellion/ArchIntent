# Development Guide

## Getting Started

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Git
- Text editor or IDE (VS Code, PyCharm recommended)

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd archintent-ai-service
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify installation**:
   ```bash
   python ai_microservice.py
   ```
   You should see: "Starting ArchIntent AI Microservice on port 5000..."

---

## Project Structure

```
archintent-ai-service/
├── ai_microservice.py          # Main Flask application
├── interactive_tester.py       # Interactive testing tool
├── test_service.py             # Automated test suite
├── requirements.txt            # Python dependencies
├── README.md                   # Quick start guide
├── API_DOCUMENTATION.md        # API reference
├── ARCHITECTURE.md             # System architecture
├── DEVELOPMENT.md              # This file
├── TASKS.md                    # Development tasks
├── CHANGELOG.md                # Version history
└── __pycache__/                # Python bytecode (ignored)
```

---

## Development Workflow

### Running the Service

**Development mode** (with auto-reload):
```bash
python ai_microservice.py
```

**Production mode** (using gunicorn - future):
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 ai_microservice:app
```

### Testing

**Interactive testing**:
```bash
python interactive_tester.py
```
Follow the prompts to test different queries.

**Automated testing**:
```bash
python test_service.py
```

**Manual testing with curl**:
```bash
# Health check
curl http://127.0.0.1:5000/

# Analyze intent
curl -X POST http://127.0.0.1:5000/api/v1/analyze-intent \
     -H "Content-Type: application/json" \
     -d '{"text": "I want a modern home"}'
```

---

## Code Style & Standards

### Python Style Guide
Follow PEP 8 conventions:
- Use 4 spaces for indentation
- Maximum line length: 79 characters for code, 72 for docstrings
- Use descriptive variable names
- Add docstrings to all functions and classes

### Naming Conventions
- **Functions**: `lowercase_with_underscores`
- **Classes**: `CapitalizedWords`
- **Constants**: `UPPERCASE_WITH_UNDERSCORES`
- **Private methods**: `_leading_underscore`

### Example:
```python
def mock_extract_keywords(text):
    """
    Simulates SpaCy NER to extract intent keywords.
    
    Args:
        text (str): Client's natural language request
        
    Returns:
        dict: Extracted intent data with style, size, and keywords
    """
    # Implementation
    pass
```

### Linting
Use `flake8` for linting:
```bash
pip install flake8
flake8 ai_microservice.py
```

### Formatting
Use `black` for auto-formatting:
```bash
pip install black
black ai_microservice.py
```

---

## Adding New Features

### 1. Adding a New Endpoint

**Step 1**: Define the route in `ai_microservice.py`:
```python
@app.route('/api/v1/new-endpoint', methods=['POST'])
def new_endpoint():
    try:
        data = request.get_json()
        # Process request
        result = process_data(data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

**Step 2**: Add tests in `test_service.py`:
```python
def test_new_endpoint(self):
    response = requests.post(f"{BASE_URL}/api/v1/new-endpoint", 
                            json={"key": "value"})
    self.assertEqual(response.status_code, 200)
    # Add more assertions
```

**Step 3**: Update `API_DOCUMENTATION.md` with the new endpoint details.

### 2. Adding Mock Data

Add new professionals to `MOCK_ARCHITECTS` list:
```python
MOCK_ARCHITECTS.append({
    "id": 5,
    "name": "New Professional",
    "style_tags": ["Tag1", "Tag2"],
    "portfolio_highlight": "Notable Project"
})
```

### 3. Enhancing Matching Logic

Modify `mock_calculate_similarity()`:
```python
def mock_calculate_similarity(extracted_data, profiles):
    # Enhanced logic
    target_style = extracted_data.get("style")
    target_size = extracted_data.get("size")
    
    for profile in profiles:
        score = calculate_base_score(profile)
        
        # Add size matching bonus
        if matches_size_preference(profile, target_size):
            score += 0.10
        
        # Existing style matching
        if target_style in profile["style_tags"]:
            score += 0.30
    
    # Return sorted results
```

---

## Environment Configuration

### Environment Variables

Create a `.env` file (future - not implemented yet):
```env
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
LOG_LEVEL=INFO
```

### Configuration Class (future):
```python
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    PORT = int(os.getenv('PORT', 5000))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
```

---

## Debugging

### Enable Debug Mode
Already enabled in development:
```python
app.run(debug=True, port=5000)
```

### Using Breakpoints
```python
import pdb

@app.route('/api/v1/analyze-intent', methods=['POST'])
def analyze_intent():
    data = request.get_json()
    pdb.set_trace()  # Breakpoint here
    # Continue debugging
```

### Logging
Add logging to track issues:
```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route('/api/v1/analyze-intent', methods=['POST'])
def analyze_intent():
    logger.info(f"Received request: {request.get_json()}")
    # Process request
    logger.debug(f"Decoded intent: {decoded_intent}")
```

---

## Performance Optimization

### Current Bottlenecks
- In-memory data (not scalable)
- Sequential processing
- No caching

### Future Optimizations

**1. Caching with Redis**:
```python
import redis
import json

cache = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_embeddings(professional_id):
    cached = cache.get(f"embedding:{professional_id}")
    if cached:
        return json.loads(cached)
    return None
```

**2. Async Processing**:
```python
from flask import Flask
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

@app.route('/api/v1/analyze-intent', methods=['POST'])
def analyze_intent():
    # Async processing for large datasets
    future = executor.submit(process_large_dataset, data)
    result = future.result()
```

**3. Database Connection Pooling** (when DB is added):
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    'postgresql://user:pass@localhost/db',
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)
```

---

## Deployment

### Local Development
```bash
python ai_microservice.py
```

### Production Deployment (future)

**Using Gunicorn**:
```bash
gunicorn -w 4 -b 0.0.0.0:5000 ai_microservice:app
```

**Using Docker**:
```dockerfile
# Dockerfile (to be created)
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "ai_microservice:app"]
```

**Build and run**:
```bash
docker build -t archintent-ai .
docker run -p 5000:5000 archintent-ai
```

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'flask'"
**Solution**: Install dependencies:
```bash
pip install -r requirements.txt
```

### Issue: "Address already in use"
**Solution**: Port 5000 is occupied. Kill the process or use a different port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### Issue: "ImportError: cannot import name 'app'"
**Solution**: Ensure you're running from the correct directory:
```bash
cd archintent-ai-service
python ai_microservice.py
```

---

## Git Workflow

### Branching Strategy
- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: New features
- `bugfix/*`: Bug fixes

### Commit Messages
Follow conventional commits:
```
feat: Add batch processing endpoint
fix: Correct similarity calculation bug
docs: Update API documentation
test: Add integration tests
refactor: Simplify keyword extraction logic
```

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Automated tests pass
- [ ] Manual testing completed
- [ ] Integration testing done

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests added/updated
```

---

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [Python PEP 8 Style Guide](https://pep8.org/)
- [SpaCy Documentation](https://spacy.io/)
- [Sentence Transformers](https://www.sbert.net/)
- [Git Best Practices](https://git-scm.com/book/en/v2)

---

## Getting Help

1. Check existing documentation files
2. Review test files for examples
3. Check GitHub issues
4. Consult with the team
