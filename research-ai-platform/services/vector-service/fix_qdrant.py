from dotenv import load_dotenv
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType
import os

print("=" * 60)
print("QDRANT FIX SCRIPT - Recreate Collection with Index")
print("=" * 60)

url = os.getenv('QDRANT_URL')
key = os.getenv('QDRANT_API_KEY')

print(f"\n1. Connecting to Qdrant...")
print(f"   URL: {url}")

try:
    client = QdrantClient(url=url, api_key=key)
    print("   [OK] Connected successfully")
except Exception as e:
    print(f"   [ERROR] Connection failed: {e}")
    exit(1)

print(f"\n2. Checking existing collections...")
try:
    collections = client.get_collections()
    existing = [c.name for c in collections.collections]
    print(f"   Existing collections: {existing}")
except Exception as e:
    print(f"   [ERROR] Failed: {e}")
    exit(1)

print(f"\n3. Deleting old 'paper_chunks' collection if exists...")
try:
    if 'paper_chunks' in existing:
        client.delete_collection('paper_chunks')
        print("   [OK] Old collection deleted")
    else:
        print("   [INFO] Collection doesn't exist, will create new")
except Exception as e:
    print(f"   [ERROR] Failed: {e}")
    exit(1)

print(f"\n4. Creating new 'paper_chunks' collection...")
try:
    client.create_collection(
        collection_name='paper_chunks',
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    print("   [OK] Collection created")
except Exception as e:
    print(f"   [ERROR] Failed: {e}")
    exit(1)

print(f"\n5. Creating index on 'paper_id' field...")
try:
    client.create_payload_index(
        collection_name='paper_chunks',
        field_name='paper_id',
        field_schema=PayloadSchemaType.KEYWORD
    )
    print("   [OK] Index created successfully")
except Exception as e:
    print(f"   [ERROR] Failed: {e}")
    exit(1)

print(f"\n6. Verifying collection and index...")
try:
    info = client.get_collection('paper_chunks')
    print(f"   [OK] Collection verified!")
    print(f"   Points count: {info.points_count}")
    print(f"   Vector size: {info.config.params.vectors.size}")
    print(f"   Distance: {info.config.params.vectors.distance}")
except Exception as e:
    print(f"   [ERROR] Verification failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("[OK] SUCCESS - Collection recreated with proper index!")
print("=" * 60)
print("\nNext steps:")
print("1. Restart vector-service")
print("2. Re-upload your papers to re-embed them")
print("3. Test the chatbot")
