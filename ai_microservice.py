from flask import Flask, request, jsonify
import random

app = Flask(__name__)

# --- Mock Data ---
MOCK_ARCHITECTS = [
    {
        "id": 1,
        "name": "Alice Sterling",
        "style_tags": ["Modern", "Minimalist", "Sustainable"],
        "portfolio_highlight": "Glass House in the Hills"
    },
    {
        "id": 2,
        "name": "Bob Builder",
        "style_tags": ["Classic", "Colonial", "Brick"],
        "portfolio_highlight": "Heritage Manor Restoration"
    },
    {
        "id": 3,
        "name": "Charlie Design",
        "style_tags": ["Industrial", "Urban", "Loft"],
        "portfolio_highlight": "Downtown Warehouse Conversion"
    },
    {
        "id": 4,
        "name": "Dana Eco",
        "style_tags": ["Eco-friendly", "Bamboo", "Modern"],
        "portfolio_highlight": "Green Roof Complex"
    }
]

# --- Mock Logic Functions ---

def mock_extract_keywords(text):
    """
    Simulates SpaCy NER to extract intent keywords.
    In a real implementation, this would use a loaded NLP model.
    """
    text_lower = text.lower()
    
    # Simple rule-based mocking for demonstration
    style = "Unknown"
    if "modern" in text_lower:
        style = "Modern"
    elif "classic" in text_lower:
        style = "Classic"
    elif "industrial" in text_lower:
        style = "Industrial"
    elif "eco" in text_lower or "sustainable" in text_lower:
        style = "Eco-friendly"
        
    size = "Standard"
    if "spacious" in text_lower or "large" in text_lower:
        size = "Large (1 Kanal+)"
    elif "small" in text_lower or "cozy" in text_lower:
        size = "Small (5-10 Marla)"
        
    keywords = [word for word in text_lower.split() if len(word) > 4]
    
    return {
        "style": style,
        "size": size,
        "extracted_keywords": keywords
    }

def mock_calculate_similarity(extracted_data, profiles):
    """
    Simulates S-BERT semantic matching.
    Assigns a mock score based on tag overlap with the extracted style.
    """
    target_style = extracted_data.get("style")
    ranked_profiles = []
    
    for profile in profiles:
        # Base score
        score = 0.60
        
        # Boost score if styles match
        if target_style in profile["style_tags"]:
            score += 0.30
        
        # Add a little random variation to simulate vector nuances
        score += random.uniform(0.0, 0.05)
        
        # Cap at 0.99
        score = min(score, 0.99)
        
        profile_with_score = profile.copy()
        profile_with_score["match_score"] = round(score, 4)
        ranked_profiles.append(profile_with_score)
    
    # Sort by score descending
    ranked_profiles.sort(key=lambda x: x["match_score"], reverse=True)
    
    return ranked_profiles

# --- API Endpoints ---

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "ArchIntent AI Microservice",
        "status": "running",
        "version": "1.0"
    }), 200

@app.route('/api/v1/analyze-intent', methods=['POST'])
def analyze_intent():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing 'text' field in payload"}), 400
            
        client_text = data['text']
        
        # Step 1: Extract Intent
        decoded_intent = mock_extract_keywords(client_text)
        
        # Step 2: Match Professionals
        recommended_professionals = mock_calculate_similarity(decoded_intent, MOCK_ARCHITECTS)
        
        response = {
            "status": "success",
            "decoded_intent": decoded_intent,
            "recommended_professionals": recommended_professionals
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting ArchIntent AI Microservice on port 5000...")
    app.run(debug=True, port=5000)
