import { ErrorHandler } from './utils/errorHandler.js';

export async function loadModule(path, critical = true) {
    try {
        const module = await import(path);
        console.log(`✅ Loaded: ${path}`);
        return module;
    } catch (error) {
        ErrorHandler.captureError(error, `module:${path}`);
        if (critical) {
            throw new Error(`Critical module ${path} failed to load: ${error.message}`);
        }
        return null;
    }
}

export async function loadModules(modules) {
    const results = await Promise.allSettled(
        modules.map(m => loadModule(m.path, m.critical))
    );
    const loaded = {};
    modules.forEach((m, i) => {
        if (results[i].status === 'fulfilled' && results[i].value) {
            loaded[m.name] = results[i].value;
        } else {
            loaded[m.name] = null;
        }
    });
    return loaded;
}