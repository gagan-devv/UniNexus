/**
 * Bug Condition Exploration Test - Depth Calculation
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
 * 
 * This test verifies the expected behavior of the calculateDepth function.
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
 * The bug: calculateDepth counts all characters in the path string instead of counting ObjectId segments.
 * 
 * Expected behavior after fix:
 * 1. Path "507f1f77bcf86cd799439011." should return depth 1 (1 ObjectId segment)
 * 2. Path "507f1f77bcf86cd799439011.507f1f77bcf86cd799439012." should return depth 2 (2 ObjectId segments)
 * 3. Path "507f1f77bcf86cd799439011.507f1f77bcf86cd799439012.507f1f77bcf86cd799439013." should return depth 3 (3 ObjectId segments)
 * 4. Empty path "" should return depth 0
 */

import fc from 'fast-check';
import { calculateDepth } from '../src/controllers/commentController';

describe('Bug Condition Exploration: Depth Calculation Counts Characters Instead of Segments', () => {
  describe('Property 1: Bug Condition - Depth Calculation for ObjectId Segments', () => {
    it('should return depth 1 for single ObjectId segment path', () => {
      const path = '507f1f77bcf86cd799439011.';
      const result = calculateDepth(path);
      
      // Expected: 1 (count of ObjectId segments)
      // Actual on unfixed code: 25 (count of all characters including dot)
      expect(result).toBe(1);
    });

    it('should return depth 2 for two ObjectId segment path', () => {
      const path = '507f1f77bcf86cd799439011.507f1f77bcf86cd799439012.';
      const result = calculateDepth(path);
      
      // Expected: 2 (count of ObjectId segments)
      // Actual on unfixed code: 50 (count of all characters including dots)
      expect(result).toBe(2);
    });

    it('should return depth 3 for three ObjectId segment path', () => {
      const path = '507f1f77bcf86cd799439011.507f1f77bcf86cd799439012.507f1f77bcf86cd799439013.';
      const result = calculateDepth(path);
      
      // Expected: 3 (count of ObjectId segments)
      // Actual on unfixed code: 75 (count of all characters including dots)
      expect(result).toBe(3);
    });

    it('should return depth 0 for empty path', () => {
      const path = '';
      const result = calculateDepth(path);
      
      // Expected: 0 (no segments)
      // This should pass even on unfixed code
      expect(result).toBe(0);
    });
  });

  describe('Property-Based Test: Depth equals count of ObjectId segments', () => {
    it('should return depth equal to the number of ObjectId segments for any valid path', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // Number of segments
          (numSegments) => {
            // Generate a path with numSegments ObjectId segments
            const objectId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId
            const segments = Array(numSegments).fill(objectId);
            const path = segments.join('.') + '.'; // Path format: "id1.id2.id3."
            
            const result = calculateDepth(path);
            
            // The depth should equal the number of segments
            // On unfixed code, this will fail because it counts characters
            return result === numSegments;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
