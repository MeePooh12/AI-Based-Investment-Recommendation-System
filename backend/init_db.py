from sqlmodel import SQLModel, create_engine, Session
import os

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "stock.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    # สำคัญ: ให้ metadata เห็นทุกตารางก่อน create_all
    from models import Stock, Price, News  # noqa: F401
    SQLModel.metadata.create_all(engine)

def get_session() -> Session:
    return Session(engine)