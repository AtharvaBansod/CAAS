"use strict";
/**
 * Session Security Types
 * Phase 2 - Authentication - Task AUTH-008
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionLimitAction = exports.ConcurrentSessionPolicy = exports.SessionBindingLevel = void 0;
var SessionBindingLevel;
(function (SessionBindingLevel) {
    SessionBindingLevel["NONE"] = "NONE";
    SessionBindingLevel["DEVICE"] = "DEVICE";
    SessionBindingLevel["IP"] = "IP";
    SessionBindingLevel["STRICT"] = "STRICT";
})(SessionBindingLevel || (exports.SessionBindingLevel = SessionBindingLevel = {}));
var ConcurrentSessionPolicy;
(function (ConcurrentSessionPolicy) {
    ConcurrentSessionPolicy["ALLOW_ALL"] = "ALLOW_ALL";
    ConcurrentSessionPolicy["LIMIT"] = "LIMIT";
    ConcurrentSessionPolicy["EXCLUSIVE"] = "EXCLUSIVE";
    ConcurrentSessionPolicy["DEVICE_EXCLUSIVE"] = "DEVICE_EXCLUSIVE";
})(ConcurrentSessionPolicy || (exports.ConcurrentSessionPolicy = ConcurrentSessionPolicy = {}));
var SessionLimitAction;
(function (SessionLimitAction) {
    SessionLimitAction["REJECT"] = "REJECT";
    SessionLimitAction["REMOVE_OLDEST"] = "REMOVE_OLDEST";
    SessionLimitAction["REMOVE_LEAST_ACTIVE"] = "REMOVE_LEAST_ACTIVE";
})(SessionLimitAction || (exports.SessionLimitAction = SessionLimitAction = {}));
//# sourceMappingURL=types.js.map
