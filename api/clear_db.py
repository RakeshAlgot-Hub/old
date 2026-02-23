import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()
MONGO_URI = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URI or not DB_NAME:
    raise RuntimeError("MONGO_URI and DB_NAME environment variables must be set.")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

for collection_name in db.list_collection_names():
    db.drop_collection(collection_name)
    print(f"Dropped collection: {collection_name}")

print("Database cleared.")
