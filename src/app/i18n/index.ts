import type { Lang } from '../storage';
import { en } from './en';
import { ru } from './ru';
import type { Dict } from './types';

export const DICTS: Record<Lang, Dict> = { ru, en };
export type { Dict };
