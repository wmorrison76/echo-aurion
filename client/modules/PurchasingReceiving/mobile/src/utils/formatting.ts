export const formatCurrency = (
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string => {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
};
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toFixed(decimals);
};
export const formatPercentage = (
  value: number,
  decimals: number = 1,
): string => {
  return `${value.toFixed(decimals)}%`;
};
export const formatQuantity = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
export const truncateString = (
  str: string,
  maxLength: number = 30,
  suffix: string = "...",
): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
};
export const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
export const capitalizeWords = (str: string): string => {
  if (!str) return str;
  return str
    .split("")
    .map((word) => capitalizeFirstLetter(word))
    .join("");
};
export const formatStatus = (status: string): string => {
  return capitalizeWords(status.replace(/_/g, ""));
};
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned[0]} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};
export const formatEmail = (email: string): string => {
  return email.toLowerCase().trim();
};
export const maskCreditCard = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length !== 16) return cardNumber;
  return `**** **** **** ${cleaned.slice(-4)}`;
};
export const formatUnitOfMeasure = (unit: string): string => {
  const unitMap: Record<string, string> = {
    oz: "oz",
    lb: "lb",
    kg: "kg",
    g: "g",
    ml: "ml",
    l: "L",
    gal: "gal",
    qt: "qt",
    pt: "pt",
    cup: "cup",
    tbsp: "Tbsp",
    tsp: "tsp",
  };
  return unitMap[unit.toLowerCase()] || unit;
};
