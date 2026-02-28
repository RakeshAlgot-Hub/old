
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from app.database.mongodb import db
from app.models.bed_schema import BedCreate, BedUpdate, BedOut

class BedService:
    def __init__(self):
        self.db = db

    async def create_bed(self, bed: BedCreate) -> BedOut:
        now = datetime.now(timezone.utc).isoformat()
        doc = bed.model_dump()
        doc["createdAt"] = now
        doc["updatedAt"] = now
        doc["id"] = str(uuid.uuid4())
        await self.db["beds"].insert_one(doc)
        return BedOut(**doc)

    async def get_bed(self, bed_id: str) -> Optional[BedOut]:
        doc = await self.db["beds"].find_one({"id": bed_id})
        if doc:
            return BedOut(**doc)
        return None

    async def update_bed(self, bed_id: str, bed_update: BedUpdate) -> Optional[BedOut]:
        update_data = {k: v for k, v in bed_update.model_dump(exclude_unset=True).items()}
        if not update_data:
            return await self.get_bed(bed_id)
        update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        result = await self.db["beds"].find_one_and_update(
            {"id": bed_id},
            {"$set": update_data},
            return_document=True
        )
        if result:
            return BedOut(**result)
        return None

    async def delete_bed(self, bed_id: str) -> bool:
        result = await self.db["beds"].delete_one({"id": bed_id})
        return result.deleted_count == 1
