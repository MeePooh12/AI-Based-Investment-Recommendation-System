import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Star } from "lucide-react";
import "./FavoritePage.css";

export default function Favorite() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  const logoMap = {
    NVDA: "https://logo.clearbit.com/nvidia.com",
    MSFT: "https://logo.clearbit.com/microsoft.com",
    UNH:  "https://logo.clearbit.com/unitedhealthgroup.com",
    AMZN: "https://logo.clearbit.com/amazon.com",
    AMD:  "https://logo.clearbit.com/amd.com",
    GOOGL:"https://logo.clearbit.com/google.com",
    MU:   "https://logo.clearbit.com/micron.com",
    TSM:  "https://logo.clearbit.com/taiwansemiconductor.com.com",
    NVO:  "https://logo.clearbit.com/novonordisk.com",
    MRK:  "https://logo.clearbit.com/merck.com",
    V:    "https://logo.clearbit.com/visa.com",
  };

  const getCompanyLogo = (symbol) => logoMap[symbol] || null;

  const fetchNews = async (symbolList) => {
    try {
      if (symbolList.length === 0) return [];
      const query = `?symbols=${symbolList.join(",")}`;
      const res = await fetch(`http://localhost:8000/news${query}`);
      if (!res.ok) throw new Error("Failed to fetch news");
      const data = await res.json();
      return data; // [{symbol, news: [...]}, ...]
    } catch (err) {
      console.error("Error fetching news:", err);
      return [];
    }
  };

  useEffect(() => {
    // ดึงข้อมูลหุ้นที่ติดดาวไว้จาก localStorage
    const stored = JSON.parse(localStorage.getItem("favorites")) || [];
    setFavorites(stored);

    if (stored.length === 0) {
      setLoading(false);
      return;
    }

    const symbolList = stored.map((s) => s.trim().toUpperCase()).filter(Boolean);

     Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const stockRes = await fetch(`http://localhost:8000/stock/${symbol}`);
          const stockData = await stockRes.json();
          return {
            symbol: stockData.symbol || stockData.ticker || symbol, // fallback เป็นตัวที่ส่งเข้าไป
            name: stockData.name,
            price: stockData.price,
            logo: getCompanyLogo(symbol),
          };
        } catch (err) {
          console.error("Error fetching stock:", symbol, err);
          return null;
        }
      })
    ).then(async (stockArray) => {
      const validStocks = stockArray.filter(Boolean);

      // fetch news พร้อมกัน
      const newsData = await fetchNews(symbolList);

      // ผูกข่าวกับหุ้น
      const finalStocks = validStocks.map((stock) => {
        const newsObj = newsData.find((n) => n.symbol === stock.symbol);
        let averageRisk = 0;
        if (newsObj && newsObj.news.length > 0) {
          let scoreSum = 0;
          newsObj.news.forEach((item) => {
            if (item.sentiment === "POSITIVE") scoreSum += 0;
            else if (item.sentiment === "NEUTRAL") scoreSum += 0.5;
            else if (item.sentiment === "NEGATIVE") scoreSum += 1;
          });
          averageRisk = scoreSum / newsObj.news.length;
        }
        return {
          ...stock,
          news: newsObj ? newsObj.news : [],
          averageRisk,
        };
      });

      setStocks(finalStocks);
      setLoading(false);
    });
  }, []);

  const removeFavorite = (symbol) => {
    const updatedFavorites = favorites.filter(
      (s) => typeof s === "string" && s.toUpperCase() !== symbol.toUpperCase()
    );
    const updatedStocks = stocks.filter(
      (s) => s.symbol && s.symbol.toUpperCase() !== symbol.toUpperCase()
    );

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    setFavorites(updatedFavorites);
    setStocks(updatedStocks);
  };

  const handleBack = () => navigate("/search"); // กลับไปหน้า dashboard

  return (
    <div className="favorite-page">
      <div className="back-button">
          <button
            onClick={handleBack} className="back-btn">
            Back
          </button>
        </div>

      <h2 className="text-3xl font-bold mb-6">Stocks to follow</h2>

       {loading ? (
        <p className="text-center">Loading...</p>
      ) : favorites.length === 0 ? (
        <p className="text-gray-600 text-center">There are no stocks you are following</p>
      ) : (
        <div className="favorite-card-container">
          {stocks.map((stock, index) => (
            <div key={stock.symbol || index} className="favorite-card">
              <Link
                to={`/stock/${stock.symbol}`}
                className="favorite-card-link"
              >
                <div className="favorite-card-left">
                  {stock.logo ? (
                    <img
                      src={stock.logo}
                      alt={stock.symbol}
                      className="favorite-logo"
                    />
                  ) : (
                    <div className="favorite-placeholder">
                      {stock.symbol.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="favorite-card-right">
                  <h3 className="favorite-symbol">{stock.symbol}</h3>
                  <span>{stock.name}</span>
                  <p className="favorite-price">
                    Latest price: <span>{stock.price}</span>
                  </p> 
                </div>
              </Link>

              {/* ⭐ ปุ่มเอาดาวออก */}
              <button
                className="unfavorite-btn"
                onClick={() => removeFavorite(stock.symbol)}
                title="Remove from favorites"
              >
                <Star fill="#facc15" stroke="#facc15" size={25} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
