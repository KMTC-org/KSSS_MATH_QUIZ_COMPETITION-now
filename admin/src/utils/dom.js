// Safe DOM manipulation helpers
import { CONSTANTS } from './constants.js';
export function safeRender(element, value) {
    if (element) {
        element.textContent = String(value ?? "");
    }
}

export function createEl(tag, className, text, styles) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    if (styles) el.style.cssText = styles;
    return el;
}

export function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.classList.add("btn-loading");
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Loading...";
    } else {
        button.classList.remove("btn-loading");
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    }
}

export function showStatus(text, color) {
    const el = document.getElementById("status-msg");
    if (!el) return;
    el.innerText = text;
    el.style.background = color;
    el.style.display = "block";
    if (color === "#16a34a") {
        setTimeout(() => {
            el.style.display = "none";
        }, CONSTANTS.SUCCESS_MESSAGE_DURATION);
    }
}