const validator = require('@app-core/validator');
const { CreatorCardMessages } = require('@app/messages');
const repository = require('@app/repository/creator-card');
const {
  buildCreatorCard,
  generateSlugFromTitle,
  serializeCreatorCard,
  throwBusinessError,
  validateBusinessFields,
} = require('./helpers');

const createCreatorCardSpec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<maxLength:500>
  slug? string<lengthBetween:5,50>
  creator_reference string<length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<maxLength:200>
  }
  service_rates? {
    currency string(NGN|USD|GBP|GHS)
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<maxLength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateCreatorCardSpec = validator.parse(createCreatorCardSpec);

async function createCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedCreateCreatorCardSpec);
  let response;

  const creatorCardRepository = options.repository || repository;
  const accessType = data.access_type || 'public';
  const isPrivate = accessType === 'private';
  const hasAccessCode = data.access_code !== undefined;

  validateBusinessFields(data);

  if (isPrivate && !hasAccessCode) {
    throwBusinessError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC01');
  }

  if (!isPrivate && hasAccessCode) {
    throwBusinessError(CreatorCardMessages.ACCESS_CODE_ON_PUBLIC_CARD, 'AC05');
  }

  let slug = data.slug;
  if (slug) {
    if (await creatorCardRepository.hasSlug(slug)) {
      throwBusinessError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }
  } else {
    slug = await generateSlugFromTitle(data.title, creatorCardRepository);
  }

  const card = buildCreatorCard(data, slug, accessType);

  try {
    const createdCard = await creatorCardRepository.create(card);
    response = serializeCreatorCard(createdCard, { includeAccessCode: true });
  } catch (error) {
    if (error.isDuplicateSlugError) {
      throwBusinessError(CreatorCardMessages.SLUG_TAKEN, 'SL02');
    }

    throw error;
  }

  return response;
}

module.exports = createCreatorCard;
