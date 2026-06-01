import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
export { toZonedTime, fromZonedTime, formatInTimeZone };
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, startOfYear, endOfYear } from 'date-fns';

const TIMEZONE = 'America/Sao_Paulo';

/**
 * Retorna o início do mês atual no timezone de Brasília, convertido para UTC.
 * Ex: 01/05/2026 00:00:00 BRT -> 01/05/2026 03:00:00 UTC
 */
export function getBRTStartOfMonth(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const start = startOfMonth(zoned);
  return fromZonedTime(start, TIMEZONE);
}

/**
 * Retorna o fim do mês atual no timezone de Brasília, convertido para UTC.
 */
export function getBRTEndOfMonth(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const end = endOfMonth(zoned);
  return fromZonedTime(end, TIMEZONE);
}

/**
 * Retorna o início da semana atual no timezone de Brasília (Segunda-feira), convertido para UTC.
 */
export function getBRTStartOfWeek(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const start = startOfWeek(zoned, { weekStartsOn: 1 }); // 1 = Segunda
  return fromZonedTime(start, TIMEZONE);
}

/**
 * Retorna o fim da semana atual no timezone de Brasília (Domingo), convertido para UTC.
 */
export function getBRTEndOfWeek(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const end = endOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(end, TIMEZONE);
}

/**
 * Retorna o início do dia no timezone de Brasília, convertido para UTC.
 */
export function getBRTStartOfDay(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const start = startOfDay(zoned);
  return fromZonedTime(start, TIMEZONE);
}

/**
 * Retorna o fim do dia no timezone de Brasília, convertido para UTC.
 */
export function getBRTEndOfDay(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const end = endOfDay(zoned);
  return fromZonedTime(end, TIMEZONE);
}

/**
 * Retorna o início do ano no timezone de Brasília, convertido para UTC.
 */
export function getBRTStartOfYear(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const start = startOfYear(zoned);
  return fromZonedTime(start, TIMEZONE);
}

/**
 * Retorna o fim do ano no timezone de Brasília, convertido para UTC.
 */
export function getBRTEndOfYear(date: Date = new Date()): Date {
  const zoned = toZonedTime(date, TIMEZONE);
  const end = endOfYear(zoned);
  return fromZonedTime(end, TIMEZONE);
}

/**
 * Converte uma data UTC para uma string formatada no timezone de Brasília.
 */
export function formatBRT(date: Date, formatStr: string = 'dd/MM/yyyy HH:mm:ss'): string {
  return formatInTimeZone(date, TIMEZONE, formatStr);
}
