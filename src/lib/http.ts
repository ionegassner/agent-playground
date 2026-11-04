import { demoMode, demoRecord } from './demo';

export async function get<T>(url: string): Promise<T> {
  if (demoMode) return demoRecord<T>(url);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
