const { expect } = require('chai');
const {
  createCreatorCard,
  deleteCreatorCard,
  retrieveCreatorCard,
} = require('@app/services/creator-card');

class InMemoryCreatorCardRepository {
  constructor() {
    this.cards = new Map();
  }

  async hasSlug(slug) {
    return this.cards.has(slug);
  }

  async create(card) {
    if (this.cards.has(card.slug)) {
      const error = new Error('duplicate key');
      error.isDuplicateSlugError = true;
      throw error;
    }

    this.cards.set(card.slug, JSON.parse(JSON.stringify(card)));
    return JSON.parse(JSON.stringify(card));
  }

  async findActiveBySlug(slug) {
    const card = this.cards.get(slug);

    if (!card || card.deleted !== null) {
      return null;
    }

    return JSON.parse(JSON.stringify(card));
  }

  async markDeletedBySlug(slug, deletedAt) {
    const card = this.cards.get(slug);

    if (!card || card.deleted !== null) {
      return null;
    }

    card.deleted = deletedAt;
    card.updated = deletedAt;
    return JSON.parse(JSON.stringify(card));
  }
}

describe('Creator Card API services', () => {
  let repository;

  beforeEach(() => {
    repository = new InMemoryCreatorCardRepository();
  });

  it('creates a full public card with id serialization and default access_type', async () => {
    const card = await createCreatorCard(
      {
        title: 'George Cooks',
        description: 'Weekly cooking podcast',
        slug: 'george-cooks',
        creator_reference: 'crt_8f2k1m9x4p7w3q5z',
        links: [{ title: 'YouTube', url: 'https://youtube.com/@georgecooks' }],
        service_rates: {
          currency: 'NGN',
          rates: [{ name: 'IG Story Post', description: 'One story mention', amount: 5000000 }],
        },
        status: 'published',
      },
      { repository }
    );

    expect(card).to.include({
      title: 'George Cooks',
      slug: 'george-cooks',
      access_type: 'public',
      access_code: null,
      deleted: null,
    });
    expect(card.id).to.be.a('string');
    expect(card).not.to.have.property('_id');
  });

  it('auto-generates slugs from titles', async () => {
    const card = await createCreatorCard(
      {
        title: 'Ada Designs Things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
        status: 'published',
      },
      { repository }
    );

    expect(card.slug).to.equal('ada-designs-things');
  });

  it('creates and retrieves private cards without exposing access_code on retrieval', async () => {
    await createCreatorCard(
      {
        title: 'VIP Rate Card',
        creator_reference: 'crt_x9y8z7w6v5u4t3s2',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      },
      { repository }
    );

    const card = await retrieveCreatorCard(
      { slug: 'vip-rate-card', access_code: 'A1B2C3' },
      { repository }
    );

    expect(card.slug).to.equal('vip-rate-card');
    expect(card).not.to.have.property('access_code');
  });

  it('soft-deletes cards and hides them from retrieval', async () => {
    await createCreatorCard(
      {
        title: 'Ada Designs Things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
        status: 'published',
      },
      { repository }
    );

    const deleted = await deleteCreatorCard(
      {
        slug: 'ada-designs-things',
        creator_reference: 'crt_a1b2c3d4e5f6g7h8',
      },
      { repository }
    );

    expect(deleted.deleted).to.be.a('number');

    try {
      await retrieveCreatorCard({ slug: 'ada-designs-things' }, { repository });
      throw new Error('Expected retrieval to fail');
    } catch (error) {
      expect(error.errorCode).to.equal('NF01');
    }
  });

  it('returns the required business-rule error codes', async () => {
    await createCreatorCard(
      {
        title: 'George Cooks',
        slug: 'george-cooks',
        creator_reference: 'crt_8f2k1m9x4p7w3q5z',
        status: 'published',
      },
      { repository }
    );

    await expectErrorCode(
      createCreatorCard(
        {
          title: 'Another George',
          slug: 'george-cooks',
          creator_reference: 'crt_m1n2b3v4c5x6z7l8',
          status: 'published',
        },
        { repository }
      ),
      'SL02'
    );

    await expectErrorCode(
      createCreatorCard(
        {
          title: 'Secret Card',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
          status: 'published',
          access_type: 'private',
        },
        { repository }
      ),
      'AC01'
    );

    await expectErrorCode(
      createCreatorCard(
        {
          title: 'Public Card',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
          status: 'published',
          access_type: 'public',
          access_code: 'A1B2C3',
        },
        { repository }
      ),
      'AC05'
    );

    await expectErrorCode(
      retrieveCreatorCard({ slug: 'does-not-exist-123' }, { repository }),
      'NF01'
    );

    await createCreatorCard(
      {
        title: 'My Draft Card',
        slug: 'my-draft-card',
        creator_reference: 'crt_d1r2a3f4t5c6a7r8',
        status: 'draft',
      },
      { repository }
    );

    await expectErrorCode(
      retrieveCreatorCard({ slug: 'my-draft-card' }, { repository }),
      'NF02'
    );

    await createCreatorCard(
      {
        title: 'VIP Rate Card',
        creator_reference: 'crt_x9y8z7w6v5u4t3s2',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      },
      { repository }
    );

    await expectErrorCode(
      retrieveCreatorCard({ slug: 'vip-rate-card' }, { repository }),
      'AC03'
    );

    await expectErrorCode(
      retrieveCreatorCard({ slug: 'vip-rate-card', access_code: 'WRONG1' }, { repository }),
      'AC04'
    );

    await expectErrorCode(
      deleteCreatorCard(
        {
          slug: 'does-not-exist-123',
          creator_reference: 'crt_q1w2e3r4t5y6u7i8',
        },
        { repository }
      ),
      'NF01'
    );
  });
});

async function expectErrorCode(promise, code) {
  try {
    await promise;
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error.errorCode).to.equal(code);
  }
}
