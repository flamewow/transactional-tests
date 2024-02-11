import { DataSource, QueryRunner } from 'typeorm';
import { RollbackFn } from '../types';
import { PatchedQueryRunner } from './transactional-ctx.interfaces';

export class TypeormTransactionalCtx {
  private queryRunner: PatchedQueryRunner | null;
  private originalQueryRunnerFn: () => QueryRunner;
  private originalRelease: () => Promise<void>;

  constructor(private readonly dataSource: DataSource) {}

  static async init(dataSource: DataSource): Promise<RollbackFn>;
  static async init(dataSources: DataSource[]): Promise<RollbackFn>;
  static async init(
    dataSources: DataSource | DataSource[],
  ): Promise<RollbackFn> {
    const _dataSources = Array.isArray(dataSources)
      ? dataSources
      : [dataSources];
    const instances = await Promise.all(
      _dataSources.map(async (dataSource) => {
        const instance = new TypeormTransactionalCtx(dataSource);
        await instance.begin();
        return instance;
      }),
    );

    return function rollbackAll() {
      return Promise.all(instances.map((instance) => instance.rollback()));
    };
  }

  async begin() {
    if (this.queryRunner) {
      throw new Error('Transaction context already started');
    }

    try {
      this.patchQueryRunner();

      await this.queryRunner!.connect();
      await this.queryRunner!.startTransaction();
    } catch (error) {
      await this.release();
      throw error;
    }
  }

  async rollback() {
    if (!this.queryRunner) {
      throw new Error('Transaction context not started');
    }
    try {
      await this.queryRunner.rollbackTransaction();
      this.restoreQueryRunner();
    } finally {
      await this.release();
    }
  }

  private patchQueryRunner() {
    const originalQueryRunner = this.dataSource.createQueryRunner();

    this.originalRelease = originalQueryRunner.release;
    originalQueryRunner.release = () => Promise.resolve();

    (originalQueryRunner as PatchedQueryRunner).releaseQueryRunner = () => {
      originalQueryRunner.release = this.originalRelease;
      return originalQueryRunner.release();
    };

    this.queryRunner = originalQueryRunner as PatchedQueryRunner;

    this.originalQueryRunnerFn = this.dataSource.createQueryRunner;
    this.dataSource.createQueryRunner = () => this.queryRunner!;
  }

  private restoreQueryRunner() {
    this.dataSource.createQueryRunner = this.originalQueryRunnerFn;
  }

  private async release() {
    if (this.queryRunner) {
      await this.queryRunner.releaseQueryRunner();
      this.queryRunner = null;
    }
  }
}
