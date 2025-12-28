import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// NEU: Ein sicherer Fetch-Wrapper für das Frontend
// Nutze das in deinen Dashboard-Pages statt dem nackten `fetch`
export async function fetcher(url) {
  const res = await fetch(url);
  if (!res.ok) {
    // Wenn der Server 401/403 meldet, ist oft das Token schuld.
    // Wir werfen einen Fehler, den SWR oder React Query fangen kann.
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
}