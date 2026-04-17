import { ErrorHandler } from './errorHandler.js';

export function createSafeModule(moduleName, moduleExports) {
    const safeExports = {};
    for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        if (typeof exportValue === 'function') {
            safeExports[exportName] = function(...args) {
                try {
                    return exportValue.apply(this, args);
                } catch (error) {
                    ErrorHandler.captureError(error, `${moduleName}.${exportName}`);
                    throw error; // Re-throw after logging
                }
            };
        } else {
            safeExports[exportName] = exportValue;
        }
    }
    return safeExports;
}