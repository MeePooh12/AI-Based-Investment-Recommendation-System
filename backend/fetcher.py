from datetime import datetime, timezone
from sqlmodel import select
import yfinance as yf
import math

from init_db import get_session   # ✅ ใช้ init_db ไม่ใช่ db
from models import Stock, Price, News
from sentiment import score_text  # ฟังก์ชันวิเคราะห์ sentiment ที่คุณมีอยู่แล้ว


def _to_float(x, default=None):
    try:
        if x is None:
            return default
        if isinstance(x, float) and math.isnan(x):
            return default
        return float(x)
    except Exception:
        return default


def fetch_and_store(tickers: list[str]):
    """ดึงราคา 1 ชั่วโมงย้อนหลัง 7 วัน + ข่าว จาก Yahoo Finance แล้วบันทึกลง SQLite"""
    with get_session() as session:
        for t in tickers:
            symbol = (t or "").upper()
            if not symbol:
                continue

            ticker = yf.Ticker(symbol)

            # -------- Stock upsert --------
            name = None
            try:
                # .info บางเวอร์ชันช้า/เด้ง ให้ fallback
                info = getattr(ticker, "info", {}) or {}
                name = info.get("shortName") or info.get("longName") or symbol
            except Exception:
                name = symbol

            stock = session.exec(select(Stock).where(Stock.ticker == symbol)).first()
            now_utc = datetime.now(timezone.utc)

            if not stock:
                stock = Stock(ticker=symbol, name=name, last_updated=now_utc)
                session.add(stock)
                session.commit()
                session.refresh(stock)
            else:
                # อัปเดตชื่อ/เวลาใน stock
                stock.name = name or stock.name or symbol
                stock.last_updated = now_utc
                session.add(stock)
                session.commit()

            # -------- Price (7d, 1h) --------
            try:
                hist = ticker.history(period="7d", interval="1h", auto_adjust=True)
            except Exception:
                hist = None

            if hist is not None and not hist.empty:
                hist = hist.reset_index()  # จะได้คอลัมน์ 'Datetime'
                price_rows = []
                for _, row in hist.iterrows():
                    # เวลาแท่งราคา
                    ts = row.get("Datetime")
                    if ts is None:
                        continue
                    # ทำให้เป็น timezone-aware (UTC)
                    if ts.tzinfo is None:
                        ts = ts.replace(tzinfo=timezone.utc)
                    else:
                        ts = ts.astimezone(timezone.utc)

                    # กันซ้ำ: ถ้ามีแท่งนี้แล้ว (ตาม timestamp) ให้ข้าม
                    exists = session.exec(
                        select(Price).where(Price.ticker == symbol, Price.last_updated == ts)
                    ).first()
                    if exists:
                        continue

                    price_rows.append(
                        Price(
                            ticker=symbol,
                            name=name,
                            last_updated=ts,  # ใช้เป็นเวลาของแท่ง
                            open=_to_float(row.get("Open")),
                            high=_to_float(row.get("High")),
                            low=_to_float(row.get("Low")),
                            close=_to_float(row.get("Close")),
                            volume=int(_to_float(row.get("Volume"), 0)) if _to_float(row.get("Volume")) is not None else None, # type: ignore
                        )
                    )

                if price_rows:
                    session.add_all(price_rows)
                    session.commit()
                    # ไม่จำเป็นต้อง refresh ทีละแถว

            # -------- News + sentiment --------
            news_list = []
            try:
                # yfinance อาจให้ 'news' เป็น list[dict] หรือว่าง
                news_list = getattr(ticker, "news", []) or []
            except Exception:
                news_list = []

            if news_list:
                to_add = []
                for n in news_list:
                    title = n.get("title") or ""
                    if not title.strip():
                        continue
                    url = n.get("link") or n.get("url") or ""
                    # เวลาข่าว
                    ts_pub = n.get("providerPublishTime") or 0
                    try:
                        published_at = datetime.fromtimestamp(int(ts_pub), tz=timezone.utc) if ts_pub else None
                    except Exception:
                        published_at = None

                    # กันซ้ำด้วย (ticker,url,published_at)
                    dup = session.exec(
                        select(News).where(
                            News.ticker == symbol,
                            News.url == url,
                            News.published_at == published_at
                        )
                    ).first()
                    if dup:
                        continue

                    # คะแนน sentiment
                    summary = n.get("summary") or ""
                    try:
                        sent = score_text(f"{title}. {summary}")
                    except Exception:
                        sent = None

                    to_add.append(
                        News(
                            ticker=symbol,
                            title=title[:500],
                            summary=summary[:2000] if summary else None,
                            url=url or None,
                            published_at=published_at,
                            sentiment=sent
                        )
                    )
                if to_add:
                    session.add_all(to_add)
                    session.commit()

        # with-session: ปิดเองเมื่อออกจากบล็อก