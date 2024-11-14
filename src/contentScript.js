function onInput(event) {
    const element = event.target;
    const value = element.value || element.innerText || '';
    saveInput(element, value);
}

let debounceTimers = new WeakMap();

function saveInput(element, value) {
    // Debounce saving for 100ms
    clearTimeout(debounceTimers.get(element));

    const timer = setTimeout(() => {
        debounceTimers.delete(element);
        processInput(element, value);
    }, 100);

    debounceTimers.set(element, timer);
}

function processInput(element, value) {
    let currentDomain = window.location.hostname;
    let topDomain = currentDomain;
    let isIframe = false;

    try {
        if (window.top !== window.self) {
            // We're in an iframe
            isIframe = true;
            try {
                topDomain = window.top.location.hostname;
            } catch (e) {
                // Cross-origin iframe
                if (document.referrer) {
                    const referrerUrl = new URL(document.referrer);
                    topDomain = referrerUrl.hostname;
                }
            }
        }
    } catch (e) {
        // Error accessing window.top
    }

    const url = window.location.href;
    const title = document.title;
    const timestamp = Date.now();

    const label = getElementLabel(element);

    const inputKey = element.dataset.chomeExtensionInputKey || getInputKey(element);

    element.dataset.chomeExtensionInputKey = inputKey;

    const record = {
        title: title,
        url: url,
        timestamp: timestamp,
        value: value
    };

    // Now save to storage
    chrome.storage.local.get(['domains'], function (data) {
        let domains = data.domains || {};

        // Save input data under currentDomain
        if (!domains[currentDomain]) {
            domains[currentDomain] = {
                lastUpdated: timestamp,
                iframeDomains: [],
                inputs: {}
            };
        } else {
            domains[currentDomain].lastUpdated = timestamp;
        }

        let domainData = domains[currentDomain];

        if (!domainData.inputs[inputKey]) {
            domainData.inputs[inputKey] = {
                label: label,
                lastUpdated: timestamp,
                records: []
            };
        } else {
            domainData.inputs[inputKey].lastUpdated = timestamp;
        }

        let inputData = domainData.inputs[inputKey];
        inputData.records.push(record);

        // If currentDomain is different and is an iframe, store it in topDomain's iframeDomains
        if (isIframe && currentDomain !== topDomain) {
            if (!domains[topDomain]) {
                domains[topDomain] = {
                    lastUpdated: timestamp,
                    iframeDomains: [],
                    inputs: {}
                };
            }

            if (!domains[topDomain].iframeDomains.includes(currentDomain)) {
                domains[topDomain].iframeDomains.push(currentDomain);
            }

            domains[topDomain].lastUpdated = timestamp;
        }

        // Save back to storage
        chrome.storage.local.set({ domains: domains });
    });
}

function getInputKey(element) {
    const label = getElementLabel(element);

    if (label) {
        return label;
    }

    return generateUniqueId(element);
}

function getElementLabel(element) {
    // Try to get label text, placeholder, name, id
    let label = '';
    // Try label element
    let id = element.id;
    if (id) {
        let labelElement = document.querySelector(`label[for="${id}"]`);
        if (labelElement) {
            label = labelElement.innerText.trim();
        }
    }
    // Try aria-label
    if (!label && element.getAttribute('aria-label')) {
        label = element.getAttribute('aria-label').trim();
    }
    // Try name
    if (!label && element.name) {
        label = element.name.trim();
    }
    // Try data-name
    if (!label && element.dataset.name) {
        label = element.dataset.name.trim();
    }
    // Try id
    if (!label && element.id) {
        label = element.id.trim();
    }
    // Try placeholder
    if (!label && element.placeholder) {
        label = element.placeholder.trim();
    }
    // As last resort, use tagName and inputKey
    if (!label) {
        label = element.tagName + ' ' + generateUniqueId(element);
    }

    return label;
}

function generateUniqueId(element) {
    return 'input-' + Math.random().toString(36).substr(2, 9);
}

// Event handler for input events
function inputEventHandler(event) {
    let element = event.target;
    if (
        (element.tagName === 'INPUT' && element.type === 'text') ||
        element.tagName === 'TEXTAREA' ||
        element.isContentEditable
    ) {
        onInput(event);
    }
}

// Attach input event listeners
function attachListeners() {
    document.addEventListener('input', inputEventHandler, true);
    document.addEventListener('change', inputEventHandler, true);
}

attachListeners();