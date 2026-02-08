import { Connection } from 'mongoose';

export class QueryProfiler {
  constructor(private connection: Connection) {}

  async enableProfiling(level: 0 | 1 | 2 = 1, slowMs: number = 100) {
    try {
      await this.connection.db?.command({
        profile: level,
        slowms: slowMs
      });
      console.log(`Profiling enabled: level=${level}, slowms=${slowMs}`);
    } catch (error) {
      console.error('Failed to enable profiling:', error);
    }
  }

  async getSlowQueries(limit: number = 10) {
    if (!this.connection.db) return [];
    
    return this.connection.db.collection('system.profile')
      .find({ millis: { $gt: 100 } })
      .sort({ ts: -1 })
      .limit(limit)
      .toArray();
  }
}
