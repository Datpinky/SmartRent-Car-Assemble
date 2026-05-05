import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gộp class Tailwind an toàn (pattern shadcn / Aceternity). */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
