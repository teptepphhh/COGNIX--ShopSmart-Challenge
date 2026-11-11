// LAB 6 fix: malformed JSON and oversized bodies were answered with code INTERNAL_ERROR
// and the raw parser message. They are client errors and now get a stable code and a
// fixed message; unexpected errors still hide their details behind a trace id.
const CLIENT_ERRORS = {
  'entity.parse.failed': { status: 400, code: 'INVALID_JSON', message: 'The request body must be valid JSON.' },
  'entity.too.large': { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' }
};

export function errorHandler(error, request, response, _next) {
  const known = CLIENT_ERRORS[error.type];
  if (known) {
    return response.status(known.status).json({ error: { code: known.code, message: known.message, traceId: request.id } });
  }
  console.error(`[${request.id}]`, error);
  const status = error.status || 500;
  const exposed = status < 500 && error.status;
  response.status(status).json({
    error: {
      code: error.code || (status < 500 ? 'BAD_REQUEST' : 'INTERNAL_ERROR'),
      message: exposed ? error.message : 'The server could not complete the request.',
      traceId: request.id
    }
  });
}
