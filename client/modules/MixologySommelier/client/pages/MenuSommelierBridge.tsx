import React, { useState, useEffect } from "react";
import { useTheme } from "../components/ThemeProvider";
import { apiService } from "../lib/api";
import { ChefHat, Wine, AlertCircle, Loader } from "lucide-react";
interface Recipe {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  ingredients: string;
  instructions: string;
  flavor_profile?: {
    intensity: number;
    acidity: number;
    richness: number;
    spice: number;
    umami: number;
  };
  wine_pairings?: Array<{ wine: string; region: string; rationale: string }>;
}
export const MenuSommelierBridge: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadRecipes();
  }, []);
  const loadRecipes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getRecipes();
      const formattedRecipes = data.map((item: any) => ({
        id: item.id,
        name: item.data?.name || item.name,
        description: item.data?.description || "",
        cuisine: item.data?.cuisine || "",
        servings: item.data?.servings || 0,
        prepTime: item.data?.prepTime || 0,
        cookTime: item.data?.cookTime || 0,
        difficulty: item.data?.difficulty || "",
        ingredients: item.data?.ingredients || "",
        instructions: item.data?.instructions || "",
        flavor_profile: item.data?.flavor_profile,
        wine_pairings: item.data?.wine_pairings,
      }));
      setRecipes(formattedRecipes);
      if (formattedRecipes.length > 0) {
        setSelectedRecipe(formattedRecipes[0]);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load recipes";
      console.error("Error loading recipes:", err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  const getFlavorColor = (value: number) => {
    if (value < 3) return "#10B981";
    if (value < 6) return "#F59E0B";
    return "#EF4444";
  };
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        padding: "2.5rem 2rem",
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.colors.background,
      }}
    >
      {" "}
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div style={{ marginBottom: "2rem" }}>
          {" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.5rem",
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
              <ChefHat
                size={28}
                style={{ color: theme.colors.background }}
              />{" "}
            </div>{" "}
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                marginBottom: 0,
                color: theme.colors.foreground,
                letterSpacing: "-0.5px",
              }}
            >
              {" "}
              Menu & Wine Pairing{" "}
            </h1>{" "}
          </div>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "0.95rem",
              marginTop: "0.25rem",
            }}
          >
            {" "}
            Select dishes from your menu and discover AI-curated wine
            pairings{" "}
          </p>{" "}
        </div>{" "}
        {error && (
          <div
            style={{
              backgroundColor: "rgba(220, 38, 38, 0.1)",
              border: "1px solid #DC2626",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
            {" "}
            <AlertCircle
              size={20}
              style={{ color: "#DC2626", flexShrink: 0, marginTop: "0.125rem" }}
            />{" "}
            <div>
              {" "}
              <p
                style={{
                  fontWeight: "600",
                  margin: "0 0 0.25rem 0",
                  color: "#DC2626",
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                Failed to load recipes{" "}
              </p>{" "}
              <p
                style={{
                  color: theme.text.secondary,
                  margin: 0,
                  fontSize: "0.85rem",
                }}
              >
                {" "}
                {error}{" "}
              </p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "400px",
            }}
          >
            {" "}
            <div style={{ textAlign: "center" }}>
              {" "}
              <Loader
                size={32}
                style={{
                  color: theme.colors.primary,
                  animation: "spin 1s linear infinite",
                }}
              />{" "}
              <p style={{ color: theme.text.secondary, marginTop: "1rem" }}>
                {" "}
                Loading recipes...{" "}
              </p>{" "}
            </div>{" "}
          </div>
        ) : recipes.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 2rem",
              backgroundColor: theme.colors.card,
              borderRadius: "12px",
              border: `1px dashed ${theme.colors.border}`,
            }}
          >
            {" "}
            <ChefHat
              size={48}
              style={{ opacity: 0.3, marginBottom: "1rem" }}
            />{" "}
            <p
              style={{
                fontSize: "1rem",
                color: theme.text.secondary,
                marginBottom: "0.5rem",
              }}
            >
              {" "}
              No recipes available{" "}
            </p>{" "}
            <p style={{ fontSize: "0.85rem", color: theme.text.secondary }}>
              {" "}
              Create recipes in Recipe Studio to see them here{" "}
            </p>{" "}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              alignItems: "start",
            }}
          >
            {" "}
            {/* Recipe List */}{" "}
            <div>
              {" "}
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  marginBottom: "1rem",
                  color: theme.colors.foreground,
                }}
              >
                {" "}
                Menu Items{" "}
              </h2>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {" "}
                {recipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    style={{
                      padding: "1rem",
                      backgroundColor:
                        selectedRecipe?.id === recipe.id
                          ? theme.colors.primary
                          : theme.colors.card,
                      color:
                        selectedRecipe?.id === recipe.id
                          ? theme.colors.background
                          : theme.colors.foreground,
                      border: `1px solid ${selectedRecipe?.id === recipe.id ? theme.colors.primary : theme.colors.border}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRecipe?.id !== recipe.id) {
                        e.currentTarget.style.backgroundColor =
                          theme.colors.muted;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRecipe?.id !== recipe.id) {
                        e.currentTarget.style.backgroundColor =
                          theme.colors.card;
                      }
                    }}
                  >
                    {" "}
                    <p style={{ margin: "0 0 0.25rem 0", fontWeight: "700" }}>
                      {" "}
                      {recipe.name}{" "}
                    </p>{" "}
                    <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>
                      {" "}
                      {recipe.cuisine}{" "}
                    </p>{" "}
                  </button>
                ))}{" "}
              </div>{" "}
            </div>{" "}
            {/* Recipe Details & Wine Pairings */}{" "}
            {selectedRecipe && (
              <div
                style={{
                  backgroundColor: theme.colors.card,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: "12px",
                  padding: "1.5rem",
                }}
              >
                {" "}
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    marginBottom: "0.75rem",
                    color: theme.colors.foreground,
                  }}
                >
                  {" "}
                  {selectedRecipe.name}{" "}
                </h2>{" "}
                <p
                  style={{
                    color: theme.text.secondary,
                    fontSize: "0.9rem",
                    marginBottom: "1rem",
                  }}
                >
                  {" "}
                  {selectedRecipe.description}{" "}
                </p>{" "}
                {/* Recipe Meta */}{" "}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    marginBottom: "1.5rem",
                    padding: "1rem",
                    backgroundColor: theme.colors.muted,
                    borderRadius: "8px",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: theme.text.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      SERVINGS{" "}
                    </p>{" "}
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "1rem",
                        fontWeight: "700",
                      }}
                    >
                      {" "}
                      {selectedRecipe.servings}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: theme.text.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      DIFFICULTY{" "}
                    </p>{" "}
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "1rem",
                        fontWeight: "700",
                      }}
                    >
                      {" "}
                      {selectedRecipe.difficulty}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: theme.text.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      PREP TIME{" "}
                    </p>{" "}
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "1rem",
                        fontWeight: "700",
                      }}
                    >
                      {" "}
                      {selectedRecipe.prepTime} min{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: theme.text.secondary,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      COOK TIME{" "}
                    </p>{" "}
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "1rem",
                        fontWeight: "700",
                      }}
                    >
                      {" "}
                      {selectedRecipe.cookTime} min{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Flavor Profile */}{" "}
                {selectedRecipe.flavor_profile && (
                  <div style={{ marginBottom: "1.5rem" }}>
                    {" "}
                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: "700",
                        marginBottom: "0.75rem",
                        color: theme.colors.foreground,
                      }}
                    >
                      {" "}
                      Flavor Profile{" "}
                    </h3>{" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {" "}
                      {Object.entries(selectedRecipe.flavor_profile).map(
                        ([key, value]) => (
                          <div key={key}>
                            {" "}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.25rem",
                              }}
                            >
                              {" "}
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                  textTransform: "capitalize",
                                }}
                              >
                                {" "}
                                {key.replace(/_/g, "")}{" "}
                              </span>{" "}
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  color: theme.text.secondary,
                                }}
                              >
                                {" "}
                                {value}/10{" "}
                              </span>{" "}
                            </div>{" "}
                            <div
                              style={{
                                height: "6px",
                                backgroundColor: theme.colors.muted,
                                borderRadius: "3px",
                                overflow: "hidden",
                              }}
                            >
                              {" "}
                              <div
                                style={{
                                  height: "100%",
                                  width: `${((value as number) / 10) * 100}%`,
                                  backgroundColor: getFlavorColor(
                                    value as number,
                                  ),
                                  transition: "width 0.3s",
                                }}
                              />{" "}
                            </div>{" "}
                          </div>
                        ),
                      )}{" "}
                    </div>{" "}
                  </div>
                )}{" "}
                {/* Wine Pairings */}{" "}
                {selectedRecipe.wine_pairings &&
                  selectedRecipe.wine_pairings.length > 0 && (
                    <div>
                      {" "}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {" "}
                        <Wine
                          size={20}
                          style={{ color: theme.colors.primary }}
                        />{" "}
                        <h3
                          style={{
                            fontSize: "1rem",
                            fontWeight: "700",
                            margin: 0,
                            color: theme.colors.foreground,
                          }}
                        >
                          {" "}
                          Recommended Wines{" "}
                        </h3>{" "}
                      </div>{" "}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                        }}
                      >
                        {" "}
                        {selectedRecipe.wine_pairings.map((pairing, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: theme.colors.muted,
                              borderRadius: "8px",
                              borderLeft: `3px solid ${theme.colors.primary}`,
                            }}
                          >
                            {" "}
                            <p
                              style={{
                                margin: "0 0 0.25rem 0",
                                fontWeight: "700",
                                fontSize: "0.95rem",
                                color: theme.colors.foreground,
                              }}
                            >
                              {" "}
                              {pairing.wine}{" "}
                            </p>{" "}
                            <p
                              style={{
                                margin: "0 0 0.5rem 0",
                                fontSize: "0.85rem",
                                color: theme.text.secondary,
                              }}
                            >
                              {" "}
                              {pairing.region}{" "}
                            </p>{" "}
                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.85rem",
                                color: theme.text.secondary,
                                fontStyle: "italic",
                              }}
                            >
                              {" "}
                              {pairing.rationale}{" "}
                            </p>{" "}
                          </div>
                        ))}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
              </div>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>{" "}
    </div>
  );
};
export default MenuSommelierBridge;
