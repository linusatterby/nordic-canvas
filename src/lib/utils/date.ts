import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM yyyy', { locale: sv });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'd MMM', { locale: sv });
}

export function formatDateRange(start: string | Date, end: string | Date): string {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  
  return `${format(startDate, 'd MMM', { locale: sv })} – ${format(endDate, 'd MMM', { locale: sv })}`;
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) return 'Idag';
  if (isTomorrow(d)) return 'Imorgon';
  if (isThisWeek(d)) return format(d, 'EEEE', { locale: sv });
  
  return formatDistanceToNow(d, { addSuffix: true, locale: sv });
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: sv });
}
