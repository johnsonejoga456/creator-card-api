const validator = require('@app-core/validator');
const { CreatorCardMessages } = require('@app/messages');
const repository = require('@app/repository/creator-card');
const { serializeCreatorCard, throwBusinessError } = require('./helpers');

const deleteCreatorCardSpec = `root {
  slug string<lengthBetween:5,50>
  creator_reference string<length:20>
}`;

const parsedDeleteCreatorCardSpec = validator.parse(deleteCreatorCardSpec);

async function deleteCreatorCard(serviceData, options = {}) {
  const data = validator.validate(serviceData, parsedDeleteCreatorCardSpec);
  let response;

  const creatorCardRepository = options.repository || repository;
  const existingCard = await creatorCardRepository.findActiveBySlug(data.slug);

  if (!existingCard) {
    throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  const deletedCard = await creatorCardRepository.markDeletedBySlug(data.slug, Date.now());

  if (!deletedCard) {
    throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  response = serializeCreatorCard(deletedCard, { includeAccessCode: true });

  return response;
}

module.exports = deleteCreatorCard;
