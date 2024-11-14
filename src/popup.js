document.addEventListener('DOMContentLoaded', function () {
    const domainListPage = document.getElementById('domainListPage');
    const domainViewPage = document.getElementById('domainViewPage');
    const inputViewPage = document.getElementById('inputViewPage');

    const domainList = document.getElementById('domainList');
    const inputList = document.getElementById('inputList');
    const recordList = document.getElementById('recordList');

    const domainTitle = document.getElementById('domainTitle');
    const inputTitle = document.getElementById('inputTitle');

    const backToDomainList = document.getElementById('backToDomainList');
    const backToDomainView = document.getElementById('backToDomainView');

    const clearAllButton = document.getElementById('clearAllButton');
    const clearDomainButton = document.getElementById('clearDomainButton');
    const clearInputButton = document.getElementById('clearInputButton');

    let currentDomain = '';
    let currentInputKey = '';

    // Initialize the popup
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = new URL(tabs[0].url);
        currentDomain = url.hostname;

        showDomainViewPage(currentDomain);
    });

    backToDomainList.addEventListener('click', function () {
        showDomainListPage();
    });

    backToDomainView.addEventListener('click', function () {
        showDomainViewPage(currentDomain);
    });

    clearAllButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all history?')) {
            chrome.storage.local.clear(function () {
                showDomainListPage();
            });
        }
    });

    clearDomainButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear history for this domain?')) {
            chrome.storage.local.get(['domains'], function (data) {
                let domains = data.domains || {};
                delete domains[currentDomain];
                chrome.storage.local.set({ domains: domains }, function () {
                    showDomainListPage();
                });
            });
        }
    });

    clearInputButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear history for this input?')) {
            chrome.storage.local.get(['domains'], function (data) {
                let domains = data.domains || {};
                let domainData = domains[currentDomain];
                if (domainData && domainData.inputs) {
                    delete domainData.inputs[currentInputKey];
                    chrome.storage.local.set({ domains: domains }, function () {
                        showDomainViewPage(currentDomain);
                    });
                }
            });
        }
    });

    function showDomainListPage() {
        domainListPage.classList.add('active');
        domainViewPage.classList.remove('active');
        inputViewPage.classList.remove('active');

        domainList.innerHTML = '';

        chrome.storage.local.get(['domains'], function (data) {
            let domains = data.domains || {};

            let domainArray = Object.keys(domains).map(domain => ({
                domain: domain,
                lastUpdated: domains[domain].lastUpdated
            }));

            domainArray.sort((a, b) => b.lastUpdated - a.lastUpdated);

            domainArray.forEach(item => {
                let li = document.createElement('li');
                li.textContent = item.domain;
                li.addEventListener('click', function () {
                    currentDomain = item.domain;
                    showDomainViewPage(item.domain);
                });
                domainList.appendChild(li);
            });
        });
    }

    function showDomainViewPage(domain) {
        domainListPage.classList.remove('active');
        domainViewPage.classList.add('active');
        inputViewPage.classList.remove('active');

        domainTitle.textContent = domain;
        inputList.innerHTML = '';

        chrome.storage.local.get(['domains'], function (data) {
            let domains = data.domains || {};
            let domainData = domains[domain];

            // Display iframe domains
            if (domainData && domainData.iframeDomains && domainData.iframeDomains.length > 0) {
                let iframeSection = document.createElement('div');
                iframeSection.innerHTML = '<h3>Included Domains:</h3>';
                let iframeList = document.createElement('ul');
                iframeList.style.listStyleType = 'none';
                iframeList.style.paddingLeft = '0';

                domainData.iframeDomains.forEach(iframeDomain => {
                    let li = document.createElement('li');
                    li.textContent = iframeDomain;
                    li.style.textDecoration = 'underline';
                    li.style.color = 'blue';
                    li.style.cursor = 'pointer';
                    li.addEventListener('click', function () {
                        currentDomain = iframeDomain;
                        showDomainViewPage(iframeDomain);
                    });
                    iframeList.appendChild(li);
                });

                iframeSection.appendChild(iframeList);
                inputList.appendChild(iframeSection);
            }

            if (domainData && domainData.inputs) {
                let inputs = domainData.inputs;
                let inputArray = Object.keys(inputs).map(inputKey => ({
                    inputKey: inputKey,
                    label: inputs[inputKey].label,
                    lastUpdated: inputs[inputKey].lastUpdated,
                    latestRecord: inputs[inputKey].records[inputs[inputKey].records.length - 1]
                }));

                inputArray.sort((a, b) => b.lastUpdated - a.lastUpdated);

                inputArray.forEach(item => {
                    let value = item.latestRecord?.value || '--empty--';
                    let li = document.createElement('li');
                    li.textContent = item.label + ': ' + value;
                    li.addEventListener('click', function () {
                        currentInputKey = item.inputKey;
                        showInputViewPage(domain, item.inputKey);
                    });
                    inputList.appendChild(li);
                });
            }
        });
    }

    function showInputViewPage(domain, inputKey) {
        domainListPage.classList.remove('active');
        domainViewPage.classList.remove('active');
        inputViewPage.classList.add('active');

        inputTitle.textContent = '';

        recordList.innerHTML = '';

        chrome.storage.local.get(['domains'], function (data) {
            let domains = data.domains || {};
            let domainData = domains[domain];

            if (domainData && domainData.inputs) {
                let inputData = domainData.inputs[inputKey];
                if (inputData) {
                    inputTitle.textContent = inputData.label;

                    let records = inputData.records;

                    records.sort((a, b) => b.timestamp - a.timestamp);

                    records.forEach((record, index) => {
                        let li = document.createElement('li');
                        li.textContent = new Date(record.timestamp).toLocaleString() + ': ' + record.value;
                        let deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Delete';
                        deleteButton.style.marginLeft = '10px';
                        deleteButton.addEventListener('click', function () {
                            if (confirm('Are you sure you want to delete this record?')) {
                                records.splice(index, 1);
                                // Save updated data
                                chrome.storage.local.set({ domains: domains }, function () {
                                    showInputViewPage(domain, inputKey);
                                });
                            }
                        });
                        li.appendChild(deleteButton);
                        recordList.appendChild(li);
                    });
                }
            }
        });
    }
});
