import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import * as fc from 'fast-check';
import api from './api';

describe('API Client Error Handling', () => {
  let mock;

  beforeEach(() => {
    // Mock the api instance directly, not the base axios import
    mock = new MockAdapter(api);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  /**
   * Property 27: Network retry
   * For any API request that fails due to network error, the system should retry 
   * the request up to 3 times with exponential backoff (1s, 2s, 4s)
   * 
   * **Validates: Requirements 15.5**
   * 
   * Feature: uninexus-phase-2-frontend-and-api-completion, Property 27: Network retry
   */
  it('Property 27: Network retry - should retry network errors up to 3 times with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom('/events', '/clubs', '/discover', '/trending', '/notifications'),
          failureCount: fc.integer({ min: 1, max: 4 })
        }),
        async ({ endpoint, failureCount }) => {
          // Track retry attempts and timing
          const attemptTimes = [];
          let attemptCount = 0;

          // Mock network error for specified number of failures
          mock.onGet(endpoint).reply((config) => {
            attemptCount++;
            attemptTimes.push(Date.now());
            
            if (attemptCount <= failureCount) {
              // Simulate network error by creating a proper error with config
              const error = new Error('Network Error');
              error.code = 'ECONNREFUSED';
              error.config = config;
              // Don't set error.response to simulate network error
              return Promise.reject(error);
            } else {
              // Success after retries
              return [200, { success: true, data: [] }];
            }
          });

          const startTime = Date.now();

          try {
            await api.get(endpoint);
            
            // If we succeed, we should have retried the appropriate number of times
            // failureCount attempts failed, then 1 succeeded
            const expectedAttempts = Math.min(failureCount + 1, 4); // Max 4 attempts (1 initial + 3 retries)
            expect(attemptCount).toBe(expectedAttempts);

            // Verify exponential backoff timing if there were retries
            if (attemptCount > 1) {
              const totalTime = Date.now() - startTime;
              // Calculate expected minimum time based on exponential backoff
              // Retry 1: 1s, Retry 2: 2s, Retry 3: 4s
              let expectedMinTime = 0;
              for (let i = 0; i < attemptCount - 1; i++) {
                expectedMinTime += Math.pow(2, i) * 1000;
              }
              // Allow some tolerance for execution time
              expect(totalTime).toBeGreaterThanOrEqual(expectedMinTime - 100);
            }
          } catch (error) {
            // If we fail, we should have attempted exactly 4 times (1 initial + 3 retries)
            expect(attemptCount).toBe(4);
            expect(error.userMessage).toBe('Network error. Please check your connection and try again.');
          }
        }
      ),
      { numRuns: 5, timeout: 15000 } // Reduced runs due to timing requirements
    );
  }, 60000); // 60 second timeout for the test
});
