const CreatorCardMessages = {
  CREATED: 'Creator Card Created Successfully.',
  RETRIEVED: 'Creator Card Retrieved Successfully.',
  DELETED: 'Creator Card Deleted Successfully.',
  SLUG_TAKEN: 'Slug is already taken',
  ACCESS_CODE_REQUIRED: 'access_code is required when access_type is private',
  ACCESS_CODE_ON_PUBLIC_CARD: 'access_code can only be set on private cards',
  CARD_NOT_FOUND: 'Creator card not found',
  PRIVATE_CARD_ACCESS_CODE_REQUIRED: 'This card is private. An access code is required',
  INVALID_ACCESS_CODE: 'Invalid access code',
  INVALID_SLUG: 'slug may only contain letters, numbers, hyphens and underscores',
  INVALID_ACCESS_CODE_FORMAT: 'access_code must be exactly 6 alphanumeric characters',
  INVALID_URL: 'links.url must start with http:// or https://',
  INVALID_AMOUNT: 'service_rates.rates.amount must be a positive integer',
  EMPTY_RATES: 'service_rates.rates must be a non-empty array',
};

module.exports = CreatorCardMessages;
