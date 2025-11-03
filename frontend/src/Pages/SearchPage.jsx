import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { LanguageContext } from "../Components/LanguageContext";
import "./SearchPage.css";

const stocks = [
  { name: "NIVDIA Corporation", symbol: "NVDA", sector: "Technology", logo: "https://logo.clearbit.com/nvidia.com"},
  { name: "Microsoft Corporation", symbol: "MSFT", sector: "Technology", logo: "https://logo.clearbit.com/microsoft.com"},
  { name: "UnitedHealth Group Incorporated",  symbol: "UNH",  sector: "Healthcare", logo: "https://logo.clearbit.com/unitedhealthgroup.com"},
  { name: "Amazon.com, Inc.", symbol: "AMZN", sector: "Consumer Discretionary", logo: "https://logo.clearbit.com/amazon.com"},
  { name: "Advanced Micro Devices, Inc.", "symbol": "AMD", sector: "Technology", logo: "https://logo.clearbit.com/amd.com" },
  { name: "Alphabet Inc.", symbol: "GOOGL", sector: "Technology", logo: "https://logo.clearbit.com/abc.xyz" },
  { name: "Micron Technology, Inc.", symbol: "MU", sector: "Technology", logo: "https://logo.clearbit.com/micron.com" },
  { name: "Taiwan Semiconductor Manufacturing Company Limited", symbol: "TSM", sector: "Technology", logo: "https://logo.clearbit.com/tsmc.com" },
  { name: "Novo Nordisk A/S", symbol: "NVO", sector: "Healthcare", logo: "https://logo.clearbit.com/novonordisk.com" },
  { name: "Merck & Co., Inc.", symbol: "MRK", sector: "Healthcare", logo: "https://logo.clearbit.com/merck.com" },
  { name: "Visa Inc.", symbol: "V", sector: "Financials", logo: "https://logo.clearbit.com/visa.com" }
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedStockData, setSelectedStockData] = useState(null);
  const [dailyNews, setDailyNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);

  const t = {
    en: { 
      title: "Stock Search", News: "News Daily", category: "There is no news in this category", 
      loading: "Loading Data...", searchstock:"Search for stock names such as NVDA", 
      favorites: "Your Favorites"  },
    th: { 
      title: "ค้นหาหุ้นที่คุณสนใจ", News: "ข่าววันนี้", category: "ไม่มีข่าวสารในหมวดหมู่นี้", 
      loading: "กำลังโหลดข้อมูล...", searchstock:"ค้นหาชื่อหุ้น เช่น NVDA", 
      favorites: "หุ้นที่คุณติดตาม" },
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);
  
  useEffect(() => {
    const favs = JSON.parse(localStorage.getItem("favorites")) || [];
    setFavorites(favs);
  }, []);

  //กรองหุ้นตาม query
   const filteredStocks = useMemo(() => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    return stocks.filter(
      (stock) =>
        stock.name.toLowerCase().includes(q) ||
        stock.symbol.toLowerCase().includes(q)
    );
  }, [debouncedQuery]);

  // ดึงข่าวรายวันจากหุ้นทั้งหมด
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const stockSlice = stocks.slice(0, 4);
        const responses = await Promise.all(
          stocks.slice(0, 4).map((s) => fetch(`http://localhost:8000/stock/${s.symbol}`))
        );
        const results = await Promise.all(responses.map((r) => r.json()));

        let news = [];

      for (let res of results) {
        const stockSymbol = res.symbol || "";
        const stockName = res.name || "";

        // 1️⃣ ข่าวจาก backend
        const apiNews = (res?.news && Array.isArray(res.news) ? res.news.slice(0, 2) : []).map((n) => ({
          ...n,
          symbol: stockSymbol,
          name: stockName,
        }));

        news = news.concat(apiNews);

        // 2️⃣ ข่าว RSS fallback (Yahoo Finance)
        try {
          const rssRes = await fetch(`http://localhost:8000/rss/${stockSymbol}`);
          const rssData = await rssRes.json();
          const rssNews = (rssData?.news || []).slice(0, 2).map((n) => ({
            ...n,
            symbol: stockSymbol,
            name: stockName,
          }));
          news = news.concat(rssNews);
        } catch (rssErr) {
          console.warn(`Failed to fetch RSS news for ${stockSymbol}:`, rssErr);
          setNewsList([]);
        }
      }

      // ลบข่าวซ้ำ (ตามลิงก์)
      const uniqueNews = [...new Map(news.map(item => [item.link, item])).values()];

      setDailyNews(uniqueNews);
    } catch (err) {
      console.error("Error fetching daily news:", err);
      setDailyNews([]);
    }
  };

  fetchNews();
}, []);

  //เลือกหุ้น
  const handleSelect =  useCallback (async (stock) => {
    setShowDropdown(false);
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/stock/${stock.symbol}`);
      const data = await res.json();
      setSelectedStockData(data);

      setTimeout(() => {
        navigate(`/stock/${stock.symbol}`);
        setLoading(false);
      }, 1000);
      console.log("ข้อมูลจาก backend:", data);

    } catch (err) {
      console.error("Fetch backend failed:", err);
      setLoading(false);
    }
  },[navigate]);

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredStocks.length === 0) return;

    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        prev < filteredStocks.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredStocks.length - 1
      );
    } else if (e.key === "Enter") {
      handleSelect(filteredStocks[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="search-page">  
        <h2 className="text-lg font-semibold mb-2">ค้นหาชื่อหุ้น</h2>
          <div className="container">
            <form className="Search-form mb-4">
              <Search
                className="absolute left-3 top-3 text-gray-400"
                size={20}
              />{" "}
              <input
                type="text"
                placeholder= "ค้นหาชื่อหุ้น เช่น NVDA, MSFT"
                className="input-option w-full pl-10 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg transition"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                />
              </form>
          </div>
          
          {showDropdown && query && filteredStocks.length > 0 && (
            <div className="dropdown-absolute">
              {filteredStocks.map((stock, index) => (
                <div
                  key={stock.symbol}
                  className="stock-row"
                  onClick={() => handleSelect(stock)}
                >
                  <div className="stock-left">
                    <img src={stock.logo} alt={stock.symbol} className="stock-logo" />
                    <div>
                      <div className="stock-symbol">{stock.symbol}</div>
                      <div className="stock-name">{stock.name}</div>
                      <div className="stock-sector">{stock.sector}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          )}{favorites.length > 0 && (
            <div className="favorites-bar flex flex-wrap gap-4 mb-6">
              {favorites.map((symbol) => {
                const stock = stocks.find((s) => s.symbol === symbol);
                if (!stock) return null;
                return (
                  <div
                    key={stock.symbol}
                    className="favorite-item"
                    onClick={() => handleSelect(stock)}
                  >
                    <img
                      src={stock.logo}
                      alt={stock.symbol}
                      title={stock.symbol}
                      className="!w-8 !h-8 rounded-full border border-gray-400 shadow-sm mb-2 object-contain"
                    />
                    <span className="favorite-name">{stock.symbol}</span>
                  </div>
                );
              })}
            </div>
          )}         

          {/* 2️⃣ หุ้นที่เลือก */}
          {selectedStockData && (
            <div className="selected-stock max-w-md mx-auto p-4 border rounded-xl bg-white shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-bold text-blue-600">{selectedStockData.ticker}</h3>
                <span className="text-gray-500 text-sm">{selectedStockData.sector || "Unknown Sector"}</span>
              </div>

              {loading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <p>{t[language].loading}</p>
                </div>
              )}
              
              {selectedStockData.sentiment && (
                <p className="mb-2">
                  Sentiment:{" "}
                  <span className={`font-medium ${
                    selectedStockData.sentiment === "Positive" ? "text-green-500" :
                    selectedStockData.sentiment === "Negative" ? "text-red-500" : "text-gray-500"
                  }`}>
                    {selectedStockData.sentiment}
                  </span>
                </p>
              )}
            </div>
          )}

        {/* 🔹 ข่าวรายวัน */}
        <h2 className="section-title">{t[language].News} </h2>
        <div className="daily-news-section mt-8">
          {dailyNews.length > 0 ? (
            [...new Map(dailyNews.map(item => [item.link, item])).values()].map((news, i) => (
              <a
                key={i}
                href={news.link}
                target="_blank"
                rel="noopener noreferrer"
                className="news-card flex bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md overflow-hidden transition p-2"
              >
                {news.image ? (
                <div className="w-28 h-24 flex-shrink-0 overflow-hidden relative">
                    <img
                      src={news.image || "/placeholder-news.png"}
                      alt={news.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="news-content">
                    <p className="font-medium text-sm dark:text-gray-100 text-gray-800 line-clamp-2 leading-snug">
                      {news.title} 
                    </p>
                    <p className="news-meta">{news.date} | {news.provider}</p>
                  </div>
                </div>
                ) : null}
                <div className={`news-content flex-1 ${news.image ? "pl-3" : ""}`}>
                  <p className="font-medium text-sm dark:text-gray-100 text-gray-800 line-clamp-2 leading-snug">
                    {news.title}
                  </p>
                  <p className="news-meta text-xs text-gray-500 dark:text-gray-400">
                    {news.date} | {news.provider}
                  </p>
                </div>
              </a>
            ))
          ) : (
          <p className="text-gray-500">{t[language].category}</p>
        )}
      </div>
    </div>
  );
}
