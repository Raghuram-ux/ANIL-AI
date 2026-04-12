import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

key = SUPABASE_SERVICE_KEY or SUPABASE_KEY

if not SUPABASE_URL or not key:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, key)

def list_files():
    try:
        print(f"Listing files in bucket 'documents'...")
        res = supabase.storage.from_('documents').list()
        if hasattr(res, 'data'):
            items = res.data
        else:
            items = res
            
        if not items:
            print("No files found in bucket 'documents'.")
            return
            
        for item in items:
            print(f"- {item['name']} (Size: {item.get('metadata', {}).get('size', 'unknown')} bytes)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_files()
