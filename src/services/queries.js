/**
 * Helpers for reading result sets that can outgrow a single request.
 *
 * Supabase serves PostgREST with `max-rows` capped (1000 by default), and it
 * truncates silently: no error, no flag, just fewer rows than the table holds.
 * Every screen that read a month of attendance was quietly losing data past
 * that point — a 50-person company generates roughly 1,550 attendance rows in a
 * month, so a third of them never reached the calculation.
 */

/** Rows requested per round trip. Stays under the default PostgREST cap. */
export const PAGE_SIZE = 1000;

/**
 * A hard stop so a runaway filter cannot pull an entire table into the browser.
 * Callers are told when they hit it rather than being handed a short list that
 * looks complete.
 */
export const MAX_ROWS = 50000;

/**
 * Read every row a query matches, one page at a time.
 *
 * @param {() => import('@supabase/supabase-js').PostgrestFilterBuilder} buildQuery
 *   Factory returning a fresh query. It is called once per page, so it must
 *   build the query anew each time rather than reusing one builder.
 * @param {{maxRows?: number, pageSize?: number}} [options]
 * @returns {Promise<{data: Array, error: any, truncated: boolean, total: number}>}
 *   `truncated` is true when maxRows was reached and more rows remain, so the
 *   caller can warn instead of presenting a partial set as the whole answer.
 *
 * @example
 * const { data, truncated } = await fetchAllRows(() =>
 *   supabase.from('attendance_logs').select('*').gte('log_date', from).lte('log_date', to)
 * );
 */
export const fetchAllRows = async (buildQuery, { maxRows = MAX_ROWS, pageSize = PAGE_SIZE } = {}) => {
  const rows = [];
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);

    if (error) {
      return { data: rows, error, truncated: false, total: rows.length };
    }

    const page = data || [];
    rows.push(...page);

    // A short page means the server had nothing more to give.
    if (page.length < pageSize) {
      return { data: rows, error: null, truncated: false, total: rows.length };
    }

    if (rows.length >= maxRows) {
      return { data: rows, error: null, truncated: true, total: rows.length };
    }

    from += pageSize;
  }
};
