import { QueryRunner } from 'typeorm';

export interface PatchedQueryRunner extends QueryRunner {
  releaseQueryRunner(): Promise<void>;
}
