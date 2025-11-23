import requests
import json
import time

def test_interactive():
    print("--- ArchIntent AI Service Interactive Tester ---")
    print("Enter a client request (or 'q' to quit)")
    print("----------------------------------------------")

    url = "http://127.0.0.1:5000/api/v1/analyze-intent"

    while True:
        user_input = input("\nClient Request: ").strip()
        if user_input.lower() == 'q':
            break
        
        if not user_input:
            continue

        payload = {"text": user_input}
        
        try:
            start_time = time.time()
            response = requests.post(url, json=payload)
            latency = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                print(f"\n[Success] (Latency: {latency:.2f}ms)")
                print(json.dumps(data, indent=2))
            else:
                print(f"\n[Error] Status: {response.status_code}")
                print(response.text)
                
        except requests.exceptions.ConnectionError:
            print("\n[Error] Could not connect to the service.")
            print("Make sure 'python ai_microservice.py' is running in another terminal!")

if __name__ == "__main__":
    test_interactive()
