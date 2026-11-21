export function createOdooAdapter(env = process.env) {
  const { ODOO_BASE_URL: origin, ODOO_DATABASE: database, ODOO_API_KEY: key } = env;
  if (!origin || !database || !key) throw new Error('Odoo integration settings are required');
  const base = new URL(origin);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(base.hostname))) {
    throw new Error('Use HTTPS for a remote Odoo server');
  }
  async function call(action, body) {
    const response = await fetch(new URL('/photonix/v1/enquiries/' + action, base), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + key, 'X-Odoo-Database': database, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const conflict = response.status === 409;
      const forbidden = response.status === 403;
      let msg = conflict ? 'The request key belongs to another enquiry' : 'CRM request failed';
      try {
        const errJson = await response.json();
        if (errJson?.error || errJson?.message) msg = errJson.error || errJson.message;
      } catch {}
      const error = new Error(msg);
      error.status = conflict ? 409 : (forbidden ? 403 : (response.status === 400 ? 400 : 503));
      throw error;
    }
    return response.json();
  }
  return {
    async createEnquiry(input) {
      let result = await call('submit', input);
      if (result?.retryCommittedKey) result = await call('submit', input);
      if (!Number.isSafeInteger(result?.id)) throw new Error('CRM did not confirm the enquiry');
      return result;
    },
    listEnquiries: scope => call('list', scope),
    getEnquiry: scope => call('get', scope),
    qualifyEnquiry: input => call('qualify', input),
    submitSurvey: input => call('submit_survey', input),
    reviewSurvey: input => call('review_survey', input),
    generateQuote: input => call('generate_quote', input)
  };
}
