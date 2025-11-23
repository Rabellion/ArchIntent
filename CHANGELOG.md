# Changelog

All notable changes to the ArchIntent AI Microservice will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Full AI integration with SpaCy and S-BERT
- Authentication and authorization
- Rate limiting
- Comprehensive logging
- Docker containerization
- CI/CD pipeline
- Laravel integration

---

## [1.0.0] - 2025-11-23

### Added
- Initial Flask microservice setup
- Mock keyword extraction function (`mock_extract_keywords`)
- Mock semantic matching function (`mock_calculate_similarity`)
- API endpoint: `GET /` for health check
- API endpoint: `POST /api/v1/analyze-intent` for intent analysis
- Mock architect data with 4 sample professionals
- Basic error handling and validation
- Interactive testing script (`interactive_tester.py`)
- Automated test suite (`test_service.py`)
- README.md with quick start guide
- requirements.txt with Flask dependency
- API response format with decoded intent and professional recommendations
- Simple rule-based style detection (Modern, Classic, Industrial, Eco-friendly)
- Simple rule-based size detection (Small, Standard, Large)
- Professional ranking by match score
- JSON request/response handling

### Features
- **Intent Decoding**: Rule-based keyword extraction for:
  - Architectural styles (modern, classic, industrial, eco-friendly)
  - Property size (small, standard, large/spacious)
  - General keywords (words > 4 characters)
  
- **Semantic Matching**: Score-based ranking algorithm:
  - Base score: 0.60
  - Style match bonus: +0.30
  - Random variation: +0.00 to +0.05
  - Maximum score: 0.99

### Technical Details
- **Framework**: Flask 2.3.0
- **Language**: Python 3.x
- **Port**: 5000
- **Debug Mode**: Enabled for development

### Documentation
- Comprehensive README with:
  - Installation instructions
  - API usage examples
  - Sample curl commands
  - Response examples
  - Future roadmap

### Testing
- Interactive tester with 5 sample queries:
  1. Modern spacious home
  2. Classic colonial house
  3. Industrial loft space
  4. Eco-friendly sustainable design
  5. Custom query input

- Automated tests covering:
  - Service health check
  - Valid intent analysis requests
  - Missing field validation
  - Response structure validation

---

## Version History Notes

### Version 1.0.0 - Phase 3 (Mock Implementation)
This is the initial release with mock implementations. The service provides a working API that demonstrates the intended functionality using rule-based logic instead of actual AI models. This allows:

1. **API Contract Establishment**: The request/response format is finalized and won't change in future versions
2. **Integration Testing**: Laravel backend can begin integration work immediately
3. **User Testing**: Stakeholders can test the user flow with realistic mock data
4. **Parallel Development**: AI model integration can proceed independently

### Migration Path to Phase 4 (Full AI)
When upgrading to use real AI models:
- API endpoints remain unchanged
- Request/response formats stay the same
- Only internal implementation changes (transparent to API consumers)
- Performance improvements with more accurate matching
- No breaking changes for existing integrations

---

## Future Releases

### [1.1.0] - Planned
- Add logging functionality
- Add health check endpoint (`/health`)
- Add input validation and sanitization
- Improve error messages
- Add request/response logging

### [1.2.0] - Planned
- Add environment variable configuration
- Add Docker support
- Add comprehensive unit tests
- Performance optimizations

### [2.0.0] - Planned (Phase 4)
- **Breaking Change**: Minimum requirements update for AI libraries
- Replace mock functions with real AI models
- SpaCy integration for NER
- S-BERT integration for semantic similarity
- Vector embeddings for professionals
- Improved matching accuracy
- Confidence scoring
- Caching layer for embeddings

### [2.1.0] - Planned (Phase 5)
- API authentication (JWT or API keys)
- Laravel integration endpoints
- Rate limiting
- CORS configuration
- Webhook support
- Batch processing endpoint

---

## Notes

### Semantic Versioning Breakdown
- **MAJOR** (X.0.0): Breaking changes (API contract changes, incompatible updates)
- **MINOR** (0.X.0): New features, backwards-compatible additions
- **PATCH** (0.0.X): Bug fixes, security patches, performance improvements

### Links
- [Repository](https://github.com/your-org/archintent-ai-service)
- [Issues](https://github.com/your-org/archintent-ai-service/issues)
- [Discussions](https://github.com/your-org/archintent-ai-service/discussions)
