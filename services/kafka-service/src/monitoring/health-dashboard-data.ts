export class HealthDashboardData {
  async getClusterOverview(): Promise<any> {
    return {
      status: 'healthy',
      activeBrokers: 3,
      underReplicatedPartitions: 0,
      offlinePartitions: 0
    };
  }
}
