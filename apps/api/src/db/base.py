from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON, Boolean
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class Organization(Base):
    __tablename__ = 'organizations'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Membership(Base):
    __tablename__ = 'memberships'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(String, nullable=False, default="operator")  # owner, admin, operator, analyst
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PlatformConnection(Base):
    __tablename__ = 'platform_connections'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    platform = Column(String, nullable=False)  # meta, google
    access_token_encrypted = Column(String, nullable=False)
    refresh_token_encrypted = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PlatformAccount(Base):
    __tablename__ = 'platform_accounts'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    platform = Column(String, nullable=False)
    platform_account_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

class Campaign(Base):
    __tablename__ = 'campaigns'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String, ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True)
    platform = Column(String, nullable=False)
    platform_account_id = Column(String, nullable=False, index=True)
    platform_campaign_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")
    budget_amount = Column(Integer, nullable=False, default=0)
    currency = Column(String, nullable=False, default="USD")
    native_payload_json = Column(JSON, nullable=True)
    normalized_payload_json = Column(JSON, nullable=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
