export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, init);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Yêu cầu thất bại.');
  return payload;
}

export const json = (method: string, value: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
});
