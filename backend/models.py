from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ticker: str
    name: Optional[str] = None
    last_updated: Optional[datetime] = None

class Price(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ticker: str
    name: str | None = None
    last_updated: datetime | None = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[int] = None

class News(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ticker: str
    title: str
    summary: Optional[str]
    url: Optional[str]
    published_at: Optional[datetime]
    sentiment: Optional[float]
