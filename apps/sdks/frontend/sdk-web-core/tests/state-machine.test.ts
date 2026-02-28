import { describe, expect, it } from 'vitest';
import { ConnectionStateMachine } from '../src/state-machine';

describe('ConnectionStateMachine', () => {
    it('starts unauthenticated and transitions through refresh/connect/degrade paths', () => {
        const machine = new ConnectionStateMachine();
        expect(machine.getState()).toBe('unauthenticated');

        expect(machine.transition('BOOTSTRAP')).toBe('token-refresh');
        expect(machine.transition('CONNECT')).toBe('connected');
        expect(machine.transition('DEGRADE')).toBe('degraded');
        expect(machine.transition('REFRESH')).toBe('token-refresh');
        expect(machine.transition('CONNECT')).toBe('connected');
    });

    it('returns unauthenticated on auth required from any state', () => {
        const machine = new ConnectionStateMachine();
        machine.transition('BOOTSTRAP');
        machine.transition('CONNECT');
        expect(machine.transition('AUTH_REQUIRED')).toBe('unauthenticated');
    });
});
