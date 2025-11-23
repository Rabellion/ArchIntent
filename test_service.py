import unittest
import json
from ai_microservice import app

class TestAIMicroservice(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_analyze_intent_modern(self):
        payload = {"text": "I want a spacious modern home"}
        response = self.app.post('/api/v1/analyze-intent', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        data = response.get_json()
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['status'], 'success')
        self.assertEqual(data['decoded_intent']['style'], 'Modern')
        self.assertTrue(len(data['recommended_professionals']) > 0)
        # Top result should likely be Alice (Modern)
        self.assertIn('Modern', data['recommended_professionals'][0]['style_tags'])

    def test_analyze_intent_classic(self):
        payload = {"text": "Looking for a classic brick house"}
        response = self.app.post('/api/v1/analyze-intent', 
                                 data=json.dumps(payload),
                                 content_type='application/json')
        
        data = response.get_json()
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data['decoded_intent']['style'], 'Classic')
        # Top result should likely be Bob (Classic)
        self.assertIn('Classic', data['recommended_professionals'][0]['style_tags'])

if __name__ == '__main__':
    unittest.main()
