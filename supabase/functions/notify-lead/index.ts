/**
 * notify-lead — emails the sales mailbox when someone registers on the site.
 *
 * The public form saves the registration itself, then calls this function
 * with the id of the row. The function reads the row with the service role,
 * so the email is built from what is stored and not from what the caller
 * sends: calling it cannot make it send arbitrary text, and one registration
 * produces one email.
 *
 * Mail goes out through Resend (https://resend.com).
 *
 * Deploy:   supabase functions deploy notify-lead --no-verify-jwt
 * Secrets:  RESEND_API_KEY      API key of the Resend account
 *           LEAD_NOTIFY_FROM    sender, on a domain verified in Resend,
 *                               e.g. "HRM Suite <noreply@goalong.co.th>"
 *           LEAD_NOTIFY_TO      recipient; defaults to amnart.gl@gmail.com
 *           ALLOWED_ORIGIN      the site address, for CORS
 *
 * --no-verify-jwt is needed because the form is used by visitors who are not
 * signed in.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { buildEmail, isUuid, refusal, type Lead } from './message.ts';

const DEFAULT_RECIPIENT = 'amnart.gl@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Build a JSON response.
 * @param status - HTTP status code.
 * @param body - Payload to serialise.
 * @returns The response with CORS headers.
 */
const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Handle one request.
 * @param request - Incoming HTTP request with `{ "id": "<lead id>" }`.
 * @returns 200 when the email was accepted or had been sent already.
 */
export const handler = async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('LEAD_NOTIFY_FROM');
  const to = Deno.env.get('LEAD_NOTIFY_TO') || DEFAULT_RECIPIENT;
  if (!url || !serviceKey || !resendKey || !from) return json(500, { error: 'Function is not configured' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid request' });
  }
  const id = (body as { id?: unknown } | null)?.id;
  if (!isUuid(id)) return json(400, { error: 'Invalid request' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: lead, error: readError } = await admin
    .from('leads')
    .select('id, organization_name, employee_count, address, contact_name, phone, email, note, source, created_at, notified_at, notify_attempts')
    .eq('id', id)
    .maybeSingle();

  // The same answer whether the id is unknown or not allowed, so ids cannot be probed.
  if (readError || !lead) return json(404, { error: 'Not found' });

  const why = refusal(lead, new Date());
  if (why === 'already_notified') return json(200, { sent: true, repeated: true });
  if (why) return json(404, { error: 'Not found' });

  // Claim the attempt first. Two calls at once: only one finds the count it read.
  const { data: claimed, error: claimError } = await admin
    .from('leads')
    .update({ notify_attempts: lead.notify_attempts + 1 })
    .eq('id', id)
    .is('notified_at', null)
    .eq('notify_attempts', lead.notify_attempts)
    .select('id');
  if (claimError) return json(500, { error: 'Could not record the attempt' });
  if (!claimed || claimed.length === 0) return json(200, { sent: true, repeated: true });

  const email = buildEmail(lead as Lead);

  let accepted = false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    accepted = response.ok;
    if (!accepted) console.error('Mail provider refused the message', response.status);
  } catch (error) {
    console.error('Mail provider could not be reached', error instanceof Error ? error.message : 'unknown error');
  }

  if (!accepted) return json(502, { error: 'Email could not be sent' });

  await admin.from('leads').update({ notified_at: new Date().toISOString() }).eq('id', id);
  return json(200, { sent: true });
};

if (import.meta.main) {
  Deno.serve(handler);
}
