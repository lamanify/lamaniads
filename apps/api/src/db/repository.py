from typing import Type, TypeVar, Generic, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from src.db.base import Base

T = TypeVar("T", bound=Base)

class BaseRepo(Generic[T]):
    def __init__(self, model: Type[T], db: AsyncSession, org_id: str):
        self.model = model
        self.db = db
        self.org_id = org_id

    async def get(self, id: str) -> Optional[T]:
        query = select(self.model).where(
            self.model.id == id,
            self.model.org_id == self.org_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list(self) -> List[T]:
        query = select(self.model).where(self.model.org_id == self.org_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, **kwargs) -> T:
        kwargs['org_id'] = self.org_id
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.commit()
        await self.db.refresh(instance)
        return instance
