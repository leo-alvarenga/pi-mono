/** Map over items with a concurrency limit */
export async function mapWithConcurrencyLimit<TIn, TOut>(
  items: TIn[],
  concurrency: number,
  fn: (item: TIn, index: number) => Promise<TOut>,
): Promise<TOut[]> {
  if (items.length === 0) return [];

  const results = new Array<TOut>(items.length);
  const limit = Math.max(1, Math.min(concurrency, items.length));

  let next = 0;
  const workers = new Array(limit).fill(null).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;

      results[i] = await fn(items[i], i);
    }
  });

  await Promise.all(workers);
  return results;
}
