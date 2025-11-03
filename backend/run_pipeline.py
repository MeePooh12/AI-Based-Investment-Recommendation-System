from init_db import create_db_and_tables 
from fetcher import fetch_and_store
TICKERS = ["NVDA","MSFT","AMZN","UNH","AMD","GOOGL","MU","TSM","NVO","MRK","V"]

if __name__ == "__main__":
    # สร้างฐานข้อมูล + ตารางทั้งหมดจาก models.py
    create_db_and_tables()

    # ดึงและบันทึกข้อมูล
    fetch_and_store(TICKERS)
    print("✅ Data fetched successfully.")

