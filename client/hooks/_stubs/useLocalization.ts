export function useLocalization() {
  return {
    isRTL: false,
    numberFormat: new Intl.NumberFormat("en-US"),
    currencyFormat: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    dateFormat: new Intl.DateTimeFormat("en-US"),
  };
}
