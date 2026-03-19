import urllib.request
import json

try:
    data = json.dumps({
        'username': 'Raghuram.L.N',
        'password': 'jaikiller@1234',
        'role': 'admin'
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://127.0.0.1:8000/auth/register',
        data=data,
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(f"Body: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"Error: {e}")
    print(f"Body: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
