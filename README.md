# Nestjs transactional ctx for tests

Nestjs flavored transactional context for general purpose databases (typeorm is the only one supported now).
This library provides a way to run your tests in a transactional context, so you can rollback all the changes made to the database after each test.

Inspired by [typeorm-transactional-tests](https://github.com/viniciusjssouza/typeorm-transactional-tests).

WIP: This library is still in development, so use it at your own risk.