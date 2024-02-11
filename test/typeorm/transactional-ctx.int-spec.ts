import { DataSource, Repository } from 'typeorm';
import { TypeormTransactionalCtx, RollbackAllFn } from '#lib';
import Person from './entities/person.entity';

describe('transactional ctx integration (sqlite0', () => {
  let dataSource: DataSource;
  let repository: Repository<Person>;
  let rollbackFn: RollbackAllFn;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      synchronize: true,
      dropSchema: true,
      entities: [Person],
      database: ':memory:',
    });
    await dataSource.initialize();
  });

  describe('rollback transaction', () => {
    it('the database should be empty', async () => {
      repository = dataSource.getRepository(Person);
      rollbackFn = await TypeormTransactionalCtx.init(dataSource);

      const entities = [
        new Person({ name: 'Aragorn' }),
        new Person({ name: 'Legolas' }),
        new Person({ name: 'Sam' }),
      ];

      await repository.save(entities);

      expect(await repository.count()).toEqual(entities.length);
      await rollbackFn();

      expect(await repository.count()).toEqual(0);
    });
  });
});
