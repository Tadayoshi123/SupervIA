// Minimal prisma mock to satisfy controllers under test
class PrismaMock {
  constructor() {
    this.user = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(async (args = {}) => {
        const email = args?.where?.email || 'test@example.com';
        return {
          id: 1,
          email,
          name: 'Test User',
          password: '$2a$10$examplehashexamplehashexampleha',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
      create: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' }),
      delete: jest.fn(),
    };
    this.dashboard = {
      create: jest.fn().mockImplementation(async (args = {}) => {
        const name = args?.data?.name ?? 'dash';
        const userId = args?.data?.userId ?? 1;
        return { id: 1, name, userId, widgets: [] };
      }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ id: 1, name: 'dash', userId: 1, widgets: [] }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    this.dashboardWidget = {
      deleteMany: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    };
  }

  $transaction = async (cb) => cb(this);
}

module.exports = { PrismaClient: PrismaMock };


