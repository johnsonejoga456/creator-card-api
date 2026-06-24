const crypto = require('crypto');
const { ulid } = require('@app-core/randomness');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');

const SLUG_REGEX = /^[A-Za-z0-9_-]+$/;
const ACCESS_CODE_REGEX = /^[A-Za-z0-9]{6}$/;
const ALPHANUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_AUTO_SLUG_ATTEMPTS = 30;

function throwBusinessError(message, code) {
  throwAppError(message, code);
}

function throwValidationError(message) {
  throwAppError(message, ERROR_CODE.VALIDATIONERR);
}

function randomAlphanumeric(length) {
  const bytes = crypto.randomBytes(length);
  let value = '';

  for (const byte of bytes) {
    value += ALPHANUMERIC[byte % ALPHANUMERIC.length];
  }

  return value;
}

function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

async function generateSlugFromTitle(title, repository) {
  const baseSlug = slugifyTitle(title);
  let slug;

  for (let attempt = 0; attempt < MAX_AUTO_SLUG_ATTEMPTS; attempt += 1) {
    slug = baseSlug;

    if (slug.length > 50) {
      slug = slug.slice(0, 50);
    }

    if (attempt > 0 || slug.length < 5 || (await repository.hasSlug(slug))) {
      const suffix = randomAlphanumeric(6);
      const prefix = slug.length > 43 ? slug.slice(0, 43) : slug;
      slug = `${prefix}-${suffix}`;
    }

    if (!(await repository.hasSlug(slug))) {
      break;
    }
  }

  if (!slug || (await repository.hasSlug(slug))) {
    throwAppError('Unable to generate a unique slug', ERROR_CODE.APPERR);
  }

  return slug;
}

function validateBusinessFields(data) {
  if (data.slug && !SLUG_REGEX.test(data.slug)) {
    throwValidationError(CreatorCardMessages.INVALID_SLUG);
  }

  if (data.access_code && !ACCESS_CODE_REGEX.test(data.access_code)) {
    throwValidationError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT);
  }

  if (data.links) {
    data.links.forEach((link) => {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throwValidationError(CreatorCardMessages.INVALID_URL);
      }
    });
  }

  if (data.service_rates) {
    if (!Array.isArray(data.service_rates.rates) || data.service_rates.rates.length === 0) {
      throwValidationError(CreatorCardMessages.EMPTY_RATES);
    }

    data.service_rates.rates.forEach((rate) => {
      if (!Number.isInteger(rate.amount) || rate.amount < 1) {
        throwValidationError(CreatorCardMessages.INVALID_AMOUNT);
      }
    });
  }
}

function serializeCreatorCard(card, { includeAccessCode }) {
  const response = {
    id: card._id,
    title: card.title,
  };

  if (card.description !== undefined) {
    response.description = card.description;
  }

  response.slug = card.slug;
  response.creator_reference = card.creator_reference;
  response.links = card.links || [];

  if (card.service_rates !== undefined) {
    response.service_rates = card.service_rates;
  }

  response.status = card.status;
  response.access_type = card.access_type;

  if (includeAccessCode) {
    response.access_code = card.access_code || null;
  }

  response.created = card.created;
  response.updated = card.updated;
  response.deleted = card.deleted || null;

  return response;
}

function buildCreatorCard(data, slug, accessType) {
  const now = Date.now();
  const card = {
    _id: ulid(),
    title: data.title,
    slug,
    creator_reference: data.creator_reference,
    links: data.links || [],
    status: data.status,
    access_type: accessType,
    access_code: accessType === 'private' ? data.access_code : null,
    created: now,
    updated: now,
    deleted: null,
  };

  if (data.description !== undefined) {
    card.description = data.description;
  }

  if (data.service_rates !== undefined) {
    card.service_rates = data.service_rates;
  }

  return card;
}

module.exports = {
  buildCreatorCard,
  generateSlugFromTitle,
  serializeCreatorCard,
  throwBusinessError,
  validateBusinessFields,
};
