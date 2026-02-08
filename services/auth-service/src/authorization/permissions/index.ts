/**
 * Permission System Module
 * 
 * Exports for permission management
 */

export * from './types';
export * from './permission-registry';
export * from './permission-resolver';
export * from './permission-hierarchy';
export * from './definitions';

// Initialize permissions
import { permissionRegistry } from './permission-registry';
import { ALL_PERMISSIONS } from './definitions';

// Register all permissions on module load
permissionRegistry.registerMany(ALL_PERMISSIONS);
