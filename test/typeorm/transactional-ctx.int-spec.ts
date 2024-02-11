import { DataSource, createConnection, getConnection, Repository } from 'typeorm';
import { TypeormTransactionalCtx } from '#lib';
import Person from './entities/person.entity';


describe('transactional ctx integration (sqlite0', () => {
  let dataSource: DataSource;
  let repository: Repository<Person>;
  let transactionalContext:  TypeormTransactionalCtx ;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      synchronize: true,
      dropSchema: true,
      entities: [Person],
      database: ':memory:',
    });

    dataSource.initialize()

    repository = dataSource.getRepository(Person);
    transactionalContext = new TypeormTransactionalCtx (dataSource);
    await transactionalContext.start();
    await Promise.all([
      repository.save(new Person({ name: 'Aragorn' })),
      repository.save(new Person({ name: 'Legolas' })),
    ]);
  });

  describe('rollback transaction', () => {
    it('the database should be empty', async () => {
      expect(await repository.count()).toEqual(2);
      await transactionalContext.finish();
      expect(await repository.count()).toEqual(0);
    });
  });
});
