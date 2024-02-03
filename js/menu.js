let windowId, tabId;

browser.windows.getCurrent({ populate: true }).then(windowInfo => {
    windowId = windowInfo.id;
    // Set the initial panel based on the current URL
    updateSidebarPanel(windowInfo.tabs[0].url);
});

const onCreated = () => {
    if (browser.runtime.lastError) {
        console.log(`Error: ${browser.runtime.lastError}`);
    } else {
        console.log("Sidebar created successfully!");
    }
}

const attachMutationObserver = () => {
    browser.tabs.executeScript({
        code: `                
            elm = document?.querySelector('div.syllable');
            input = document?.querySelector('.selfTurn input');
            if (elm) {
                console.log("FOUND ELEMENT");
                // Initial update
                browser.runtime.sendMessage({
                    action: 'syllable',
                    data: elm.innerText
                });
                rules = window.eval('rules');
                milestone = window.eval('milestone');
                selfPeerId = window.eval('selfPeerId');
                if (typeof milestone === 'object' && milestone.playerStatesByPeerId && !milestone.playerStatesByPeerId[selfPeerId] && rules) {
                    // Send bonus letters from the rules (if you're not participating in the active game)
                    keys = Object.keys(rules.customBonusAlphabet.value).filter(key => rules.customBonusAlphabet.value[key] > 0);
                    browser.runtime.sendMessage({
                        action: 'alphabet',
                        data: keys.join('')
                    });
                } else if (typeof milestone === 'object' && milestone.playerStatesByPeerId) {
                    // Send bonus letters using the user's id
                    keys = Object.keys(milestone.playerStatesByPeerId[selfPeerId].bonusLetters).filter(key => milestone.playerStatesByPeerId[selfPeerId].bonusLetters[key] > 0);
                    browser.runtime.sendMessage({
                        action: 'alphabet',
                        data: keys.join('')
                    });
                }
                // Update via event listener (only add event listeners once)
                if (window.executedScript !== true) {
                    window.executedScript = true;
                    window.addEventListener('visibilitychange', () => {
                        if (typeof milestone === 'object' && milestone.playerStatesByPeerId && !milestone.playerStatesByPeerId[selfPeerId] && rules) {
                            // Send bonus letters from the rules (if you're not participating in the active game)
                            keys = Object.keys(rules.customBonusAlphabet.value).filter(key => rules.customBonusAlphabet.value[key] > 0);
                            browser.runtime.sendMessage({
                                action: 'alphabet',
                                data: keys.join('')
                            });
                        } else if (typeof milestone === 'object' && milestone.playerStatesByPeerId) {
                            // Send bonus letters using the user's id
                            keys = Object.keys(milestone.playerStatesByPeerId[selfPeerId].bonusLetters).filter(key => milestone.playerStatesByPeerId[selfPeerId].bonusLetters[key] > 0);
                            browser.runtime.sendMessage({
                                action: 'alphabet',
                                data: keys.join('')
                            });
                        }
                    });
                    // console.log("ADDING EVENT LISTENERS");
                    syllableObserver = new MutationObserver((mutationList, _observer) => {
                        for (const mutation of mutationList) {
                            if (mutation.type === 'childList') {
                                browser.runtime.sendMessage({
                                    action: 'syllable',
                                    data: elm.innerText
                                });
                            }
                        }
                    });
                    syllableObserver.observe(elm, { 
                        childList: true 
                    });
                    // Check separately in case there are issues with the input 
                    if (input) {
                        const inputParent = input.parentElement.parentElement;
                        // console.log("FOUND INPUT");
                        inputObserver = new MutationObserver((mutationList, _observer) => {
                            for (const mutation of mutationList) {
                                if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
                                    // Send bonus when the input is untoggled/toggled
                                    if (typeof milestone === 'object' && milestone.playerStatesByPeerId && !milestone.playerStatesByPeerId[selfPeerId] && rules) {
                                        // Send bonus letters from the rules (if you're not participating in the active game)
                                        keys = Object.keys(rules.customBonusAlphabet.value).filter(key => rules.customBonusAlphabet.value[key] > 0);
                                        browser.runtime.sendMessage({
                                            action: 'alphabet',
                                            data: keys.join('')
                                        });
                                    } else if (typeof milestone === 'object' && milestone.playerStatesByPeerId) {
                                        // Send bonus letters using the user's id
                                        keys = Object.keys(milestone.playerStatesByPeerId[selfPeerId].bonusLetters).filter(key => milestone.playerStatesByPeerId[selfPeerId].bonusLetters[key] > 0);
                                        browser.runtime.sendMessage({
                                            action: 'alphabet',
                                            data: keys.join('')
                                        });
                                    }

                                }
                            }
                        });
                        inputObserver.observe(inputParent, {
                            attributes: true,
                            attributeFilter: ['hidden']
                        });
                    }
                }
            }
        `,
        allFrames: true,
        runAt: "document_end"
    })
    .then(res => {
        console.log('Successfully injected script into iframe', res);
    }).catch(err => {
        console.error('Error executing script:', err);
    });
};

const updateSidebarPanel = (currentURL) => {
    if (!/^https:\/\/(phoenix|falcon)\.jklm\.fun\/games\/bombparty\/?$/.test(currentURL) && !/^https:\/\/jklm\.fun\/[A-Z]{4}$/.test(currentURL)) {
        // Set the panel to a 404 page
        browser.sidebarAction.setPanel({
            panel: "/html/404.html"
        });
    } else {
        // Set the panel to your desired page
        browser.sidebarAction.setPanel({
            panel: "/html/sidebar.html"
        });
        // Check if the page is completely loaded before attaching the observer
        browser.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0] && tabs[0].status === "complete") {
                attachMutationObserver();
            }
        });
    }
}

const setCurrentPanel = () => {
    browser.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) {
            const curr = tabs[0];
            tabId = curr.id;
            updateSidebarPanel(curr.url);
        }
    })
}

// Event listener for when the active tab is updated
browser.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    if (tab.id === tabId && changeInfo.status === "complete") {
        updateSidebarPanel(tab.url);
    }
});

// Event listener for when the active tab is changed
browser.tabs.onActivated.addListener(activeInfo => {
    if (activeInfo.windowId === windowId) {
        tabId = activeInfo.tabId;
        browser.tabs.get(activeInfo.tabId).then(tab => {
            updateSidebarPanel(tab.url);
        });
    }
});

// Event listener for when the active tab is completely loaded and initialized
browser.webNavigation.onCompleted.addListener(details => {
    browser.tabs.get(details.tabId).then(tab => {
        updateSidebarPanel(tab.url);
    });
})

browser.runtime.onMessage.addListener(message => {
    if (message.action == 'initialization') {
        browser.tabs.query({ active: true, currentWindow: true }, tabs => {
            // attachMutationObserver();
            updateSidebarPanel(tabs[0].url);
        });
    }
});

browser.menus.create({
    id: "toggleSidebar",
    title: browser.i18n.getMessage("toggleSidebar"),
    contexts: ["all"],
    command: "_execute_sidebar_action",
    icons: {
        48: "icons/bomb_48.png",
        96: "icons/bomb_96.png"
    }
}, onCreated);

// Initialization of panel
setCurrentPanel();