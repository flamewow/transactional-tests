import { wrap , TypeormTransactionalCtx} from '#lib'
import { Connection, QueryRunner } from 'typeorm'

describe('TransactionalTestContext', () => {
  let connection: Connection
  let transactionalTestContext: TypeormTransactionalCtx
  let wrappedRunner: any
  const queryRunner = {} as QueryRunner



  beforeEach(() => {
    connection = Object.create({
      createQueryRunner: jest.fn().mockImplementation(() => queryRunner)
    }) as Connection;

    wrappedRunner = {
      connect: jest.fn(),
      releaseQueryRunner: jest.fn(),
      startTransaction: jest.fn(),
      rollbackTransaction: jest.fn()
    }

    transactionalTestContext = new TypeormTransactionalCtx(connection)
  })

  describe('start', () => {
    describe('when the context is started with success', () => {
      beforeEach(async () => {
        await transactionalTestContext.start()
      })

      it('should create the wrapped query builder', () => {
        expect(wrap).toHaveBeenCalledWith(queryRunner)
      })

      it('should connect with the database', () => {
        expect(wrappedRunner.connect).toHaveBeenCalled()
      })

      it('should start the transaction', () => {
        expect(wrappedRunner.startTransaction).toHaveBeenCalled()
      })
    })

    describe('when there is an error during the process', () => {
      beforeEach(async () => {
        wrappedRunner.startTransaction.mockImplementation(() => {
          throw new Error('boom!')
        })
        try {
          await transactionalTestContext.start()
        } catch (error) {
          // do nothing
        }
      })

      it('should clean the resources', () => {
        expect(wrappedRunner.releaseQueryRunner).toHaveBeenCalled()
      })
    })

    describe('when creating the runner fails', () => {
      beforeEach(async () => {
        connection.createQueryRunner = jest.fn(() => {
          throw new Error('boom!')
        })
        try {
          await transactionalTestContext.start()
        } catch (error) {
          // do nothing
        }
      })

      it('should clean the resources', () => {
        expect(wrappedRunner.releaseQueryRunner).not.toHaveBeenCalled()
      })
    })

    describe('when start is called twice', () => {
      beforeEach(async () => {
        await transactionalTestContext.start()
      })

      it('should raise an error', () => {
        expect(transactionalTestContext.start()).rejects.toThrow('Context already started')
      })
    })
  })

  describe('finish', () => {
    describe('when the context is finished with success', () => {
      beforeEach(async () => {
        await transactionalTestContext.start()
        await transactionalTestContext.finish()
      })

      it('should rollback the transaction', () => {
        expect(wrappedRunner.rollbackTransaction).toHaveBeenCalled()
      })

      it('should clean the resources', () => {
        expect(wrappedRunner.releaseQueryRunner).toHaveBeenCalled()
      })
    })

    describe('when there is an error during the process', () => {
      beforeEach(async () => {
        await transactionalTestContext.start()
        await transactionalTestContext.finish()
      })

      beforeEach(() => {
        wrappedRunner.rollbackTransaction.mockImplementation(() => {
          throw new Error('boom!')
        })
      })

      it('should clean the resources', () => {
        expect(wrappedRunner.releaseQueryRunner).toHaveBeenCalled()
      })
    })

    describe('when the context has not been started yet', () => {
      it('should raise an error', () => {
        expect(transactionalTestContext.finish()).rejects.toThrow(new RegExp('Context not started'))
      })
    })
  })
})
