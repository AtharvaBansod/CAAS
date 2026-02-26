import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes with clsx + tailwind-merge */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format a date to a readable string */
export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions) {
    const merged: Intl.DateTimeFormatOptions = {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...opts,
    };
    // Strip undefined values to avoid Intl.DateTimeFormat errors
    const clean = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined)
    ) as Intl.DateTimeFormatOptions;
    return new Intl.DateTimeFormat('en-US', clean).format(new Date(date));
}

/** Format a number with commas */
export function formatNumber(n: number) {
    return new Intl.NumberFormat('en-US').format(n);
}

/** Truncate a string and add ellipsis */
export function truncate(str: string, length: number) {
    return str.length > length ? str.slice(0, length) + '...' : str;
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string) {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
    }
    return false;
}

/** Mask an API key: show first 8 and last 4 characters */
export function maskApiKey(key: string) {
    if (key.length <= 12) return '****';
    return `${key.slice(0, 8)}${'*'.repeat(Math.max(key.length - 12, 4))}${key.slice(-4)}`;
}

/** Generate a random ID */
export function generateId() {
    return Math.random().toString(36).substring(2, 15);
}

/** Sleep for ms */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
