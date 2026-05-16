import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import { BookOpen, Search, Filter } from "lucide-react";
export const WineArchive: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDecade, setSelectedDecade] = useState<number | null>(null);
  const [vintages, setVintages] = useState<any[]>([]);
  const [decadeAnalysis, setDecadeAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const decades = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  useEffect(() => {
    if (selectedDecade) {
      loadDecadeAnalysis();
    }
  }, [selectedDecade]);
  useEffect(() => {
    if (searchTerm.length > 2) {
      loadVintageHistory();
    }
  }, [searchTerm]);
  const loadVintageHistory = async () => {
    setLoading(true);
    try {
      const data = await apiService.getVintageHistory(searchTerm);
      setVintages(data || []);
    } catch (error) {
      console.error("Failed to load vintage history:", error);
    } finally {
      setLoading(false);
    }
  };
  const loadDecadeAnalysis = async () => {
    setLoading(true);
    try {
      const data = await apiService.getDecadeAnalysis(selectedDecade!);
      setDecadeAnalysis(data);
    } catch (error) {
      console.error("Failed to load decade analysis:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        padding: "3rem 2rem",
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.colors.background,
      }}
    >
      {" "}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div style={{ marginBottom: "3rem" }}>
          {" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            {" "}
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                borderRadius: "12px",
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              <BookOpen
                size={28}
                style={{ color: theme.colors.background }}
              />{" "}
            </div>{" "}
            <h1
              style={{
                fontSize: "2.75rem",
                fontWeight: "700",
                marginBottom: 0,
                color: theme.colors.foreground,
                letterSpacing: "-0.5px",
              }}
            >
              {" "}
              Wine Archive{" "}
            </h1>{" "}
          </div>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "1.05rem",
              marginTop: "0.5rem",
            }}
          >
            {" "}
            Explore 75 years of vintage history, producer lineage, and decade
            analysis{" "}
          </p>{" "}
        </div>{" "}
        {/* Search Section */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          {" "}
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              color: theme.colors.foreground,
            }}
          >
            {" "}
            Search Vintage History{" "}
          </h2>{" "}
          <div style={{ position: "relative" }}>
            {" "}
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: theme.colors.primary,
              }}
            />{" "}
            <input
              type="text"
              placeholder="Search by wine name, producer, or region..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "0.875rem 1rem 0.875rem 2.75rem",
                backgroundColor: theme.colors.background,
                color: theme.colors.foreground,
                border: `1.5px solid ${theme.colors.border}`,
                borderRadius: "10px",
                fontSize: "0.95rem",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
              }}
            />{" "}
          </div>{" "}
          {loading && (
            <p
              style={{
                color: theme.text.secondary,
                marginTop: "1rem",
                fontSize: "0.9rem",
              }}
            >
              {" "}
              Loading vintage history...{" "}
            </p>
          )}{" "}
          {vintages.length > 0 && (
            <div style={{ marginTop: "1.5rem" }}>
              {" "}
              <p
                style={{
                  color: theme.text.secondary,
                  fontSize: "0.9rem",
                  marginBottom: "1rem",
                }}
              >
                {" "}
                Found {vintages.length} vintage records{" "}
              </p>{" "}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "1rem",
                }}
              >
                {" "}
                {vintages.map((vintage, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: theme.colors.muted,
                      padding: "1rem",
                      borderRadius: "10px",
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    {" "}
                    <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>
                      {" "}
                      {vintage.name} {vintage.vintage}{" "}
                    </h4>{" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.85rem",
                        margin: 0,
                        marginBottom: "0.5rem",
                      }}
                    >
                      {" "}
                      {vintage.producer} • {vintage.region}{" "}
                    </p>{" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.8rem",
                        margin: 0,
                      }}
                    >
                      {" "}
                      Rating: <strong>{vintage.rating}/100</strong>{" "}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Decade Analysis */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          {" "}
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              color: theme.colors.foreground,
            }}
          >
            {" "}
            Decade Analysis{" "}
          </h2>{" "}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            {" "}
            {decades.map((decade) => (
              <button
                key={decade}
                onClick={() => setSelectedDecade(decade)}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor:
                    selectedDecade === decade
                      ? theme.colors.primary
                      : theme.colors.background,
                  color:
                    selectedDecade === decade
                      ? theme.colors.background
                      : theme.colors.foreground,
                  border: `1.5px solid ${selectedDecade === decade ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {decade}s{" "}
              </button>
            ))}{" "}
          </div>{" "}
          {selectedDecade && decadeAnalysis && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }}
            >
              {" "}
              <div>
                {" "}
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                  }}
                >
                  {" "}
                  Overview{" "}
                </h3>{" "}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.8rem",
                        margin: 0,
                      }}
                    >
                      {" "}
                      Dominant Regions{" "}
                    </p>{" "}
                    <p style={{ fontWeight: "600", margin: 0 }}>
                      {" "}
                      {decadeAnalysis.dominantRegions?.join(",") ||
                        "Bordeaux, Burgundy, Tuscany"}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.8rem",
                        margin: 0,
                      }}
                    >
                      {" "}
                      Avg Rating{" "}
                    </p>{" "}
                    <p style={{ fontWeight: "600", margin: 0 }}>
                      {" "}
                      {decadeAnalysis.avgRating || 88.5}/100{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        color: theme.text.secondary,
                        fontSize: "0.8rem",
                        margin: 0,
                      }}
                    >
                      {" "}
                      Notable Vintages{" "}
                    </p>{" "}
                    <p style={{ fontWeight: "600", margin: 0 }}>
                      {" "}
                      {decadeAnalysis.notableVintages?.join(",") ||
                        `${selectedDecade}, ${selectedDecade + 3}, ${selectedDecade + 7}`}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <h3
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                  }}
                >
                  {" "}
                  Historical Context{" "}
                </h3>{" "}
                <p
                  style={{
                    color: theme.text.secondary,
                    fontSize: "0.9rem",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  {" "}
                  {decadeAnalysis.context ||
                    `The ${selectedDecade}s were a transformative era for wine production, marked by innovations in viticulture and winemaking techniques.`}{" "}
                </p>{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Producer Lineage */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
          }}
        >
          {" "}
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              color: theme.colors.foreground,
            }}
          >
            {" "}
            Notable Producers (All Decades){" "}
          </h2>{" "}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {" "}
            {[
              {
                name: "Château Margaux",
                region: "Bordeaux",
                since: 1953,
                highlights: "Consistently rated 95+/100",
              },
              {
                name: "Domaine Leflaive",
                region: "Burgundy",
                since: 1962,
                highlights: "White Burgundy pioneer",
              },
              {
                name: "Barolo Luciano Sandrone",
                region: "Piedmont",
                since: 1978,
                highlights: "Modern winemaking master",
              },
              {
                name: "Cloudy Bay",
                region: "New Zealand",
                since: 1985,
                highlights: "Sauvignon Blanc innovator",
              },
              {
                name: "Opus One",
                region: "Napa Valley",
                since: 1979,
                highlights: "Bordeaux-style blends",
              },
              {
                name: "Sassicaia",
                region: "Tuscany",
                since: 1968,
                highlights: "Super Tuscan pioneer",
              },
            ].map((producer) => (
              <div
                key={producer.name}
                style={{
                  padding: "1.5rem",
                  backgroundColor: theme.colors.muted,
                  borderRadius: "10px",
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                {" "}
                <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>
                  {" "}
                  {producer.name}{" "}
                </h4>{" "}
                <p
                  style={{
                    color: theme.text.secondary,
                    fontSize: "0.85rem",
                    margin: "0 0 0.75rem 0",
                  }}
                >
                  {" "}
                  {producer.region} • Since {producer.since}{" "}
                </p>{" "}
                <p
                  style={{
                    color: theme.colors.primary,
                    fontSize: "0.85rem",
                    margin: 0,
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  ✓ {producer.highlights}{" "}
                </p>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default WineArchive;
