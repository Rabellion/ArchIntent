# Contributing Guide

Thank you for your interest in contributing to the ArchIntent AI Microservice! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

---

## Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the project
- Show empathy towards other contributors

---

## Getting Started

### Prerequisites
- Python 3.8+
- Git
- Virtual environment tool
- Basic understanding of Flask and REST APIs

### Setup Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/archintent-ai-service.git
   cd archintent-ai-service
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL-OWNER/archintent-ai-service.git
   ```

4. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

5. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # If available
   ```

6. **Verify setup**:
   ```bash
   python ai_microservice.py
   python test_service.py
   ```

---

## Development Process

### Workflow

1. **Create a branch** for your work:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-number-description
   ```

2. **Make your changes**:
   - Write code following our [coding standards](#coding-standards)
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   python test_service.py
   python interactive_tester.py
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Add new feature" # See commit message guidelines
   ```

5. **Keep your branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

### Branch Naming

Use descriptive branch names:
- `feature/add-batch-processing` - New features
- `bugfix/fix-similarity-calculation` - Bug fixes
- `docs/update-api-documentation` - Documentation updates
- `refactor/simplify-matching-logic` - Code refactoring
- `test/add-integration-tests` - Test additions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

**Format**: `<type>(<scope>): <description>`

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(api): Add batch processing endpoint
fix(matching): Correct similarity score calculation
docs(readme): Update installation instructions
test(api): Add integration tests for analyze-intent
refactor(keywords): Simplify extraction logic
chore(deps): Update Flask to 2.3.0
```

---

## Coding Standards

### Python Style Guide

Follow [PEP 8](https://pep8.org/) conventions:

**Indentation**: Use 4 spaces (not tabs)
```python
def example_function():
    if condition:
        do_something()
```

**Line Length**: Maximum 79 characters for code
```python
# Good
result = some_function(parameter1, parameter2,
                      parameter3, parameter4)

# Avoid
result = some_function(parameter1, parameter2, parameter3, parameter4, parameter5, parameter6)
```

**Naming Conventions**:
```python
# Functions and variables: lowercase_with_underscores
def calculate_similarity(text):
    user_input = text.lower()

# Classes: CapitalizedWords
class IntentAnalyzer:
    pass

# Constants: UPPERCASE_WITH_UNDERSCORES
MAX_RESULTS = 10
DEFAULT_PORT = 5000

# Private methods: _leading_underscore
def _internal_helper():
    pass
```

**Docstrings**: Include for all public functions and classes
```python
def mock_extract_keywords(text):
    """
    Extract keywords from client request text.
    
    This is a mock implementation using rule-based pattern matching.
    In Phase 4, this will be replaced with SpaCy NER.
    
    Args:
        text (str): Client's natural language request describing their needs
        
    Returns:
        dict: Dictionary containing:
            - style (str): Detected architectural style
            - size (str): Detected property size category
            - extracted_keywords (list): List of relevant keywords
            
    Example:
        >>> result = mock_extract_keywords("I want a modern home")
        >>> result['style']
        'Modern'
    """
    # Implementation
```

**Imports**: Group and order properly
```python
# Standard library imports
import os
import sys
import json

# Third-party imports
from flask import Flask, request, jsonify
import numpy as np

# Local imports
from utils import helper_function
```

### Code Quality Tools

**Linting** (check code style):
```bash
pip install flake8
flake8 ai_microservice.py
```

**Formatting** (auto-format code):
```bash
pip install black
black ai_microservice.py
```

**Type Checking** (optional but recommended):
```bash
pip install mypy
mypy ai_microservice.py
```

---

## Testing Guidelines

### Test Coverage

All new features must include tests. Aim for:
- Unit tests for individual functions
- Integration tests for API endpoints
- Edge case handling

### Writing Tests

**Test file naming**: `test_*.py`

**Test function naming**: `test_<feature>_<scenario>`

**Example**:
```python
import unittest
import requests

BASE_URL = "http://127.0.0.1:5000"

class TestIntentAnalysis(unittest.TestCase):
    def test_analyze_intent_valid_request(self):
        """Test analyze-intent with valid input"""
        payload = {"text": "I want a modern home"}
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze-intent",
            json=payload
        )
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'success')
        self.assertIn('decoded_intent', data)
    
    def test_analyze_intent_missing_text(self):
        """Test analyze-intent with missing 'text' field"""
        payload = {}
        response = requests.post(
            f"{BASE_URL}/api/v1/analyze-intent",
            json=payload
        )
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())
```

### Running Tests

**All tests**:
```bash
python test_service.py
```

**Specific test**:
```bash
python -m unittest test_service.TestIntentAnalysis.test_analyze_intent_valid_request
```

**With coverage**:
```bash
pip install coverage
coverage run -m unittest test_service.py
coverage report
coverage html  # Generate HTML report
```

---

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] Branch is up-to-date with main

### PR Title Format

Use conventional commit format:
```
feat: Add batch processing endpoint
fix: Correct similarity calculation bug
docs: Update API documentation
```

### PR Description Template

```markdown
## Description
Brief description of what this PR does

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update

## Related Issues
Fixes #123
Relates to #456

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe testing performed:
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in complex areas
- [ ] I have updated the documentation accordingly
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged

## Additional Notes
Add any other context about the PR here
```

### Review Process

1. **Automated checks** must pass:
   - Linting
   - Tests
   - Code coverage (if configured)

2. **Code review** by maintainers:
   - At least one approval required
   - Address review comments
   - Update PR as needed

3. **Merge** by maintainer:
   - Squash merge for feature branches
   - Keep clean commit history

---

## Issue Reporting

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** for solutions
3. **Verify the issue** with latest version

### Issue Template

**Bug Report**:
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10, macOS 12.0]
- Python Version: [e.g., 3.9.5]
- Flask Version: [e.g., 2.3.0]

## Additional Context
Screenshots, logs, or other relevant information
```

**Feature Request**:
```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How do you envision this feature working?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information
```

---

## Areas to Contribute

### High Priority
- Full AI integration (SpaCy, S-BERT)
- Authentication and authorization
- Comprehensive logging
- Docker containerization
- Performance optimizations

### Medium Priority
- Additional unit tests
- Integration tests
- Documentation improvements
- Code refactoring
- Error handling enhancements

### Good First Issues
- Documentation updates
- Adding more sample test cases
- Improving error messages
- Code style improvements
- Adding type hints

---

## Getting Help

- **Documentation**: Check existing `.md` files
- **Discord/Slack**: Join our community chat (if available)
- **Email**: Contact maintainers at [email]
- **GitHub Discussions**: Ask questions in Discussions tab

---

## Recognition

Contributors will be recognized in:
- README.md Contributors section
- Release notes
- Project documentation

Thank you for contributing to ArchIntent! 🎉
