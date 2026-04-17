// Centralized error handling system
export const ErrorHandler = {
    errors: [],
    listeners: new Set(),

    captureError(error, source = 'unknown') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            source,
            timestamp: new Date().toISOString()
        };
        this.errors.push(errorInfo);
        console.error(`[${source}]`, error);
        this.notifyListeners(errorInfo);
        this.showErrorIndicator(errorInfo);
        return errorInfo;
    },

    notifyListeners(errorInfo) {
        this.listeners.forEach(listener => listener(errorInfo));
    },

    onError(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    },

    showErrorIndicator(errorInfo) {
        // Only show if not already shown
        if (document.getElementById('global-error-indicator')) return;
        const errorBadge = document.createElement('div');
        errorBadge.id = 'global-error-indicator';
        errorBadge.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #ef4444;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            z-index: 10000;
            font-family: monospace;
            font-size: 12px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        errorBadge.innerHTML = `⚠️ Error: ${errorInfo.message.substring(0, 50)}...`;
        errorBadge.onclick = () => this.showErrorDetails();
        document.body.appendChild(errorBadge);
    },

    showErrorDetails() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e293b;
            color: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            z-index: 10001;
            max-width: 80%;
            max-height: 80%;
            overflow: auto;
            font-family: monospace;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;
        modal.innerHTML = `
            <h3 style="margin-top:0;">Error Log</h3>
            <pre style="white-space: pre-wrap;">${this.errors.map(e => 
                `[${e.timestamp}] ${e.source}: ${e.message}\n${e.stack}`
            ).join('\n\n')}</pre>
            <button id="close-error-modal" style="margin-top:10px; padding:5px 10px;">Close</button>
        `;
        document.body.appendChild(modal);
        document.getElementById('close-error-modal').onclick = () => modal.remove();
    },

    clearErrors() {
        this.errors = [];
        const indicator = document.getElementById('global-error-indicator');
        if (indicator) indicator.remove();
    }
};

// Global error handlers
window.addEventListener('error', (event) => {
    ErrorHandler.captureError(event.error || new Error(event.message), 'window.onerror');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.captureError(event.reason, 'unhandledrejection');
});