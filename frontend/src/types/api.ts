/** Field name → list of messages, as returned in the API's `errors` object. */
export type FieldErrors = Record<string, string[]>;

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
