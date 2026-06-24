const { CreatorCardMessages } = require('@app/messages');
const repository = require('@app/repository/creator-card');
const { serializeCreatorCard, throwBusinessError } = require('./helpers');

async function retrieveCreatorCard(serviceData, options = {}) {
  let response;
  const creatorCardRepository = options.repository || repository;
  const card = await creatorCardRepository.findActiveBySlug(serviceData.slug);

  if (!card) {
    throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF01');
  }

  if (card.status === 'draft') {
    throwBusinessError(CreatorCardMessages.CARD_NOT_FOUND, 'NF02');
  }

  if (card.access_type === 'private' && serviceData.access_code === undefined) {
    throwBusinessError(CreatorCardMessages.PRIVATE_CARD_ACCESS_CODE_REQUIRED, 'AC03');
  }

  if (card.access_type === 'private' && serviceData.access_code !== card.access_code) {
    throwBusinessError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
  }

  response = serializeCreatorCard(card, { includeAccessCode: false });

  return response;
}

module.exports = retrieveCreatorCard;
