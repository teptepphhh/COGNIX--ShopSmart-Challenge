// LAB 6 fix: the API returns field-level details for a rejected order (422 INVALID_ORDER),
// but checkout only showed "Check the customer and cart information.".
const FIELD_LABELS = {
  customerName: 'Full name must be 2 to 80 characters (spaces at the start or end are not counted).',
  email: 'Email address must be a valid address, for example juan@example.com.',
  address: 'Delivery address must be 10 to 300 characters (spaces at the start or end are not counted).',
  items: 'The cart contains an invalid item or quantity. Return to the cart and check it.'
};

export function describeOrderError(error) {
  const fields = Object.keys(error?.details?.fieldErrors || {});
  const lines = fields.map((field) => FIELD_LABELS[field] || `${field} is invalid.`);
  return { message: error?.message || 'The order could not be placed.', fields: lines };
}
