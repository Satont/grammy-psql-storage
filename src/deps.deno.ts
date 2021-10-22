import type { Client } from 'https://deno.land/x/postgres@v0.13.0/mod.ts';
export type { StorageAdapter } from 'https://deno.land/x/grammy/mod.ts';
export type { Client } from 'https://deno.land/x/postgres@v0.13.0/mod.ts';

export function buildQueryRunner(client: Client) {
  return async (query: string, params?: string[]) => {
    const { rows } = await client.queryObject(query, { params })

    return rows
  }
}