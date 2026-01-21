from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), index=True, nullable=True)  # 允许空邮箱
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关联
    ppts = relationship("PPT", back_populates="owner")


class PPT(Base):
    __tablename__ = "ppts"

    id = Column(String(50), primary_key=True, index=True)  # task_id as primary key
    title = Column(String(200), default="WenfengAI 生成")
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    progress = Column(Integer, default=0)
    result_url = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="ppts")
