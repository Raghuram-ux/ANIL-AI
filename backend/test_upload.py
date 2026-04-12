import requests

BASE_URL = "http://127.0.0.1:8000"
USERNAME = "Raghuram.L.N"
PASSWORD = "jaikiller@1234"

def test_upload():
    # 1. Login
    print("Logging in...")
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": USERNAME, "password": PASSWORD}
    )
    if resp.status_code != 200:
        print(f"Login failed: {resp.status_code} - {resp.text}")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Login OK, token: {token[:30]}...")

    # 2. Check Supabase debug
    print("\nChecking Supabase config...")
    resp2 = requests.get(f"{BASE_URL}/admin/documents/debug/supabase", headers=headers)
    print(f"Supabase debug: {resp2.json()}")

    # 3. Upload a test file
    print("\nUploading file...")
    file_content = b"This is a test document about Rajalakshmi Institute of Technology."
    files = {"file": ("test_doc.txt", file_content, "text/plain")}
    data = {"audience": "all", "allow_display": "true"}
    
    resp3 = requests.post(
        f"{BASE_URL}/admin/documents",
        headers=headers,
        files=files,
        data=data
    )
    
    if resp3.status_code == 200:
        print("Upload successful!")
        print(resp3.json())
    else:
        print(f"Upload failed: {resp3.status_code} - {resp3.text}")

if __name__ == "__main__":
    test_upload()
