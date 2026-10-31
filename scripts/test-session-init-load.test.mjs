import assert from 'node:assert/strict'
import test from 'node:test'
import * as harness from './test-session-init-load.mjs'

test('accepts the loopback app and isolated local test database', () => {
  const config = harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100',
    mongoUri: 'mongodb://127.0.0.1:27017/fquiz_load_test',
  })

  assert.equal(config.apiBaseUrl.hostname, '127.0.0.1')
  assert.equal(config.databaseName, 'fquiz_load_test')
})

test('rejects a public API URL before opening MongoDB', () => {
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'https://fquiz.online',
    mongoUri: 'mongodb://127.0.0.1:27017/fquiz_load_test',
  }), /loopback/)
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100/remote-proxy',
    mongoUri: 'mongodb://127.0.0.1:27017/fquiz_load_test',
  }), /loopback/)
})

test('rejects remote MongoDB and a non-test database', () => {
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100',
    mongoUri: 'mongodb+srv://example.invalid/fquiz',
  }), /loopback/)
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100',
    mongoUri: 'mongodb://db.example.invalid:27017/fquiz_load_test',
  }), /loopback/)
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100',
    mongoUri: 'mongodb://localhost:27017/fquiz',
  }), /fquiz_load_test/)
  assert.throws(() => harness.validateLocalConfig({
    apiBaseUrl: 'http://127.0.0.1:3100',
    mongoUri: 'mongodb://127.0.0.1:27018/fquiz_load_test',
  }), /27017/)
})

test('calculates nearest-rank latency percentiles', () => {
  assert.equal(harness.percentile([9, 1, 5, 3, 7], 0.5), 5)
  assert.equal(harness.percentile([9, 1, 5, 3, 7], 0.95), 9)
  assert.throws(() => harness.percentile([], 0.5), /non-empty/)
  assert.throws(() => harness.percentile([1, 2], 0), /greater than 0/)
})
