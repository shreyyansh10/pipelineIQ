from dotenv import load_dotenv
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType
import os

print("=" * 60)
print("QDRANT CONNECTION TEST")
print("=" * 60)

url = os.getenv('QDRANT_URL')
key = os.getenv('QDRANT_API_KEY')

print(f"\n1. Environment Variables:")
print(f"   QDRANT_URL: {url}")
print(f"   QDRANT_API_KEY: {'✅ Found' if key else '❌ Missing'} ({len(key) if key else 0} chars)")

if not url or not key:
    print("\n❌ FAILED: Missing credentials in .env file")
    exit(1)

print(f"\n2. Testing connection to Qdrant Cloud...")
try:
    client = QdrantClient(url=url, api_key=key)
    print("   ✅ Client initialized")
except Exception as e:
    print(f"   ❌ Client creation failed: {e}")
    exit(1)

print(f"\n3. Listing existing collections...")
try:
    collections = client.get_collections()
    existing = [c.name for c in collections.collections]
    print(f"   ✅ Connected successfully!")
    print(f"   Existing collections: {existing if existing else 'None'}")
except Exception as e:
    print(f"   ❌ Failed to list collections: {e}")
    exit(1)

print(f"\n4. Creating 'paper_chunks' collection with index...")
try:
    if 'paper_chunks' in existing:
        print("   ℹ️  Collection already exists, deleting first...")
        client.delete_collection('paper_chunks')
    
    client.create_collection(
        collection_name='paper_chunks',
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    print("   ✅ Collection created successfully!")
    
    # Create index on paper_id field
    client.create_payload_index(
        collection_name='paper_chunks',
        field_name='paper_id',
        field_schema=PayloadSchemaType.KEYWORD
    )
    print("   ✅ Index on paper_id field created!")
except Exception as e:
    print(f"   ❌ Collection creation failed: {e}")
    exit(1)

print(f"\n5. Verifying collection exists...")
try:
    info = client.get_collection('paper_chunks')
    print(f"   ✅ Collection verified!")
    print(f"   Points count: {info.points_count}")
    print(f"   Vector size: {info.config.params.vectors.size}")
except Exception as e:
    print(f"   ❌ Verification failed: {e}")
    exit(1)

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED - Qdrant is ready to use!")
print("=" * 60)
