"use strict";
/**
 * Revocation Types
 * Phase 2 - Authentication - Task AUTH-004
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationReason = void 0;
var RevocationReason;
(function (RevocationReason) {
    RevocationReason["LOGOUT"] = "LOGOUT";
    RevocationReason["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    RevocationReason["SECURITY_BREACH"] = "SECURITY_BREACH";
    RevocationReason["ADMIN_ACTION"] = "ADMIN_ACTION";
    RevocationReason["TOKEN_REUSE"] = "TOKEN_REUSE";
    RevocationReason["DEVICE_REMOVED"] = "DEVICE_REMOVED";
    RevocationReason["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    RevocationReason["USER_DELETED"] = "USER_DELETED";
    RevocationReason["TENANT_SUSPENDED"] = "TENANT_SUSPENDED";
})(RevocationReason || (exports.RevocationReason = RevocationReason = {}));
//# sourceMappingURL=types.js.map