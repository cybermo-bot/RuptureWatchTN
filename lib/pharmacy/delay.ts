// The report's second tap, shared by the web form and the WhatsApp bot.
// "Il y a 3 jours", "4 à 7 jours", "Plus d'une semaine": ordered_at = now minus 3, 5 or 8 days.
// "Moins de 3 jours" inserts nothing: the order is too recent to count (72-hour rule).

export const DELAY_DAYS = { d3: 3, d5: 5, d8: 8 } as const;
export type CountedDelay = keyof typeof DELAY_DAYS;
export type DelayChoice = CountedDelay | 'lt3';
export const DELAY_CHOICES: DelayChoice[] = ['d3', 'd5', 'd8', 'lt3'];

export function isDelayChoice(value: string): value is DelayChoice {
  return (DELAY_CHOICES as string[]).includes(value);
}
