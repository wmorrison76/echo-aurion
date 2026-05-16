import {
  format,
  formatDistanceToNow,
  parseISO,
  isToday,
  isYesterday,
  isSameDay,
} from "date-fns";
export const formatDate = (
  date: string | Date,
  formatStr: string = "MMM dd, yyyy",
): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr);
};
export const formatTime = (
  date: string | Date,
  formatStr: string = "hh:mm a",
): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr);
};
export const formatDateTime = (
  date: string | Date,
  formatStr: string = "MMM dd, yyyy hh:mm a",
): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr);
};
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};
export const getDateLabel = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (isToday(dateObj)) {
    return "Today";
  }
  if (isYesterday(dateObj)) {
    return "Yesterday";
  }
  return formatDate(dateObj, "MMM dd");
};
export const getDateTimeLabel = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const label = getDateLabel(dateObj);
  const time = formatTime(dateObj);
  return `${label} at ${time}`;
};
export const groupByDate = <T extends { date: string | Date }>(
  items: T[],
): Record<string, T[]> => {
  return items.reduce(
    (acc, item) => {
      const dateLabel = getDateLabel(item.date);
      if (!acc[dateLabel]) {
        acc[dateLabel] = [];
      }
      acc[dateLabel].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
};
export const isWithinDays = (date: string | Date, days: number): boolean => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
};
export const isExpired = (expiryDate: string | Date): boolean => {
  const dateObj =
    typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate;
  return dateObj < new Date();
};
export const getDaysUntilExpiry = (expiryDate: string | Date): number => {
  const dateObj =
    typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate;
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};
