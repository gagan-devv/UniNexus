import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { getRedisClient } from '../config/redis';

export class CacheService {
  private redisClient: Redis | null;

  constructor(redisClient: Redis | null) {
    this.redisClient = redisClient;
  }

  async get(key: string): Promise<any> {
    if (!this.redisClient) {
      logger.debug('Redis client not available, skipping cache get');
      return null;
    }

    try {
      const value = await this.redisClient.get(key);
      if (!value) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }
      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    if (!this.redisClient) {
      logger.debug('Redis client not available, skipping cache set');
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redisClient.setex(key, ttl, serialized);
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error instanceof Error ? error.message : String(error));
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redisClient) {
      logger.debug('Redis client not available, skipping cache delete');
      return;
    }

    try {
      await this.redisClient.del(key);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error instanceof Error ? error.message : String(error));
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.redisClient) {
      logger.debug('Redis client not available, skipping cache pattern delete');
      return;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      logger.error(`Cache pattern delete error for pattern ${pattern}:`, error instanceof Error ? error.message : String(error));
    }
  }

  generateKey(resourceType: string, operation: string, identifier: string): string {
    return `${resourceType}:${operation}:${identifier}`;
  }

  hashFilters(filters: Record<string, any>): string {
    // Sort keys to ensure consistent hashing
    const sortedKeys = Object.keys(filters).sort();
    const sortedFilters: Record<string, any> = {};
    sortedKeys.forEach(key => {
      sortedFilters[key] = filters[key];
    });
    
    const filterString = JSON.stringify(sortedFilters);
    return crypto.createHash('md5').update(filterString).digest('hex');
  }

  async getEvents(filters: Record<string, any>): Promise<any> {
    const filterHash = this.hashFilters(filters);
    const key = this.generateKey('events', 'list', filterHash);
    return await this.get(key);
  }

  /**
   * Cache events with filters
   * @param filters - Filter object
   * @param data - Events data to cache (can be array or object with events and pagination)
   * @param ttl - Time to live in seconds (default: 300)
   */
  async setEvents(filters: Record<string, any>, data: any, ttl: number = 300): Promise<void> {
    const filterHash = this.hashFilters(filters);
    const key = this.generateKey('events', 'list', filterHash);
    await this.set(key, data, ttl);
  }

  /**
   * Invalidate all event caches
   */
  async invalidateEvents(): Promise<void> {
    await this.delPattern('events:*');
  }

  /**
   * Club caching methods
   */

  /**
   * Get cached clubs by filters
   * @param filters - Filter object
   * @returns Cached clubs or null
   */
  async getClubs(filters: Record<string, any>): Promise<any> {
    const filterHash = this.hashFilters(filters);
    const key = this.generateKey('clubs', 'list', filterHash);
    return await this.get(key);
  }

  /**
   * Cache clubs with filters
   * @param filters - Filter object
   * @param data - Clubs data to cache (can be array or object with clubs and pagination)
   * @param ttl - Time to live in seconds (default: 300)
   */
  async setClubs(filters: Record<string, any>, data: any, ttl: number = 300): Promise<void> {
    const filterHash = this.hashFilters(filters);
    const key = this.generateKey('clubs', 'list', filterHash);
    await this.set(key, data, ttl);
  }

  /**
   * Invalidate all club caches
   */
  async invalidateClubs(): Promise<void> {
    await this.delPattern('clubs:*');
  }

  /**
   * User profile caching methods
   */

  /**
   * Get cached user profile
   * @param userId - User ID
   * @returns Cached profile or null
   */
  async getUserProfile(userId: string): Promise<any> {
    const key = this.generateKey('users', 'profile', userId);
    return await this.get(key);
  }

  /**
   * Cache user profile
   * @param userId - User ID
   * @param profile - Profile object to cache
   * @param ttl - Time to live in seconds (default: 600)
   */
  async setUserProfile(userId: string, profile: any, ttl: number = 600): Promise<void> {
    const key = this.generateKey('users', 'profile', userId);
    await this.set(key, profile, ttl);
  }

  /**
   * Invalidate user profile cache
   * @param userId - User ID
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    const key = this.generateKey('users', 'profile', userId);
    await this.del(key);
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    if (!this.redisClient) {
      return false;
    }

    try {
      const response = await this.redisClient.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Cache ping error:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export const getCacheService = (): CacheService => {
  if (!cacheServiceInstance) {
    const redisClient = getRedisClient();
    cacheServiceInstance = new CacheService(redisClient);
  }
  return cacheServiceInstance;
};
