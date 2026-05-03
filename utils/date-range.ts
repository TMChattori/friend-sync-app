export function parseDateKey(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number) {
  const parsed = parseDateKey(date);
  parsed.setDate(parsed.getDate() + days);
  return formatDateKey(parsed);
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

export function isDateWithinRange(targetDate: string, startDate: string, endDate?: string | null) {
  const normalizedEndDate = endDate || startDate;
  return compareDateKeys(targetDate, startDate) >= 0 && compareDateKeys(targetDate, normalizedEndDate) <= 0;
}

export function enumerateDateRange(startDate: string, endDate?: string | null) {
  const normalizedEndDate = endDate || startDate;
  const dates: string[] = [];
  let cursor = startDate;

  while (compareDateKeys(cursor, normalizedEndDate) <= 0) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function formatDateRangeLabel(startDate: string, endDate?: string | null) {
  const start = parseDateKey(startDate);
  const normalizedEndDate = endDate || startDate;
  const end = parseDateKey(normalizedEndDate);

  const startLabel = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  if (startDate === normalizedEndDate) {
    return startLabel;
  }

  return `${startLabel} 〜 ${end.getMonth() + 1}月${end.getDate()}日`;
}
