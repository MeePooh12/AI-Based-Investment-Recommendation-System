from sqlmodel import SQLModel, create_engine, Session
from models import Stock

DATABASE_URL = "sqlite:///database.db"
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    return Session(engine)

def init_db():
    SQLModel.metadata.create_all(engine)