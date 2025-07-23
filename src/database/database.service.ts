import { Injectable, Inject } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService {
  constructor(@Inject('PG_CONNECTION') private readonly pool: Pool) {}

  /**
   * Execute a query with parameters
   */
  async query(text: string, params?: any[]): Promise<QueryResult> {
    return this.pool.query(text, params);
  }

  /**
   * Execute a query and return a single row
   */
  async queryOne(text: string, params?: any[]): Promise<any> {
    const result = await this.pool.query(text, params);
    return result.rows[0] || null;
  }

  /**
   * Execute a query and return all rows
   */
  async queryAll(text: string, params?: any[]): Promise<any[]> {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  /**
   * Get current database time
   */
  async getCurrentTime(): Promise<Date> {
    const result = await this.queryOne('SELECT NOW() as now');
    return result.now;
  }

  /**
   * Check if database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<void> {
    await this.pool.query('BEGIN');
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(): Promise<void> {
    await this.pool.query('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(): Promise<void> {
    await this.pool.query('ROLLBACK');
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback();
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    const stats = await this.queryOne(`
      SELECT 
        current_database() as database_name,
        version() as version,
        current_user as current_user,
        current_timestamp as current_timestamp
    `);
    return stats;
  }

  /**
   * Get the underlying pool for advanced operations
   */
  getPool(): Pool {
    return this.pool;
  }
} 