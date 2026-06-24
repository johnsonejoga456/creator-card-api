const { CreatorCard } = require('@app/models');

function extractRecord(recordDocument) {
  if (!recordDocument) return null;
  return recordDocument._doc || recordDocument;
}

async function hasSlug(slug) {
  const existingCard = await CreatorCard.findOne({ slug }, { _id: 1 }).lean();
  return Boolean(existingCard);
}

async function create(card) {
  try {
    const createdCard = await new CreatorCard(card).save();
    return extractRecord(createdCard);
  } catch (error) {
    if (parseInt(error.code, 10) === 11000) {
      error.isDuplicateSlugError = true;
    }

    throw error;
  }
}

async function findActiveBySlug(slug) {
  return CreatorCard.findOne({ slug, deleted: null }).lean();
}

async function markDeletedBySlug(slug, deletedAt) {
  return CreatorCard.findOneAndUpdate(
    { slug, deleted: null },
    { deleted: deletedAt, updated: deletedAt },
    { new: true, lean: true }
  );
}

module.exports = {
  hasSlug,
  create,
  findActiveBySlug,
  markDeletedBySlug,
};
