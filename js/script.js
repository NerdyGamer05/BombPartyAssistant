const start_btn = document.getElementById('start');
const syllable_elm = document.getElementById('syllable');
const words = document.getElementById('words');
const wordsList = [];
const short = !words ? null : document.getElementById('short');
const average = !words ? null : document.getElementById('average');
const long = !words ? null : document.getElementById('long');
const best = !words ? null : document.getElementById('best');
const bounds = {
    short: [0,6],
    average: [7,12],
    long: [13,Infinity]
}
const rules = {
    short: false,
    average: false,
    long: false,
    best: false
}
const bonusLetters = new Set();
let syllable = null;

document.addEventListener('DOMContentLoaded', () => {
    // Configure rules & bonus
    browser.storage.local.get(['short', 'average', 'long', 'best'])
    .then(res => {
        if (res.short) {
            document.getElementById('btncheck1').checked = true;
            rules.short = true;
        }
        if (res.average) {
            document.getElementById('btncheck2').checked = true;
            rules.average = true;
        }
        if (res.long) {
            document.getElementById('btncheck3').checked = true;
            rules.long = true;
        }
        if (res.best) {
            document.getElementById('btncheck4').checked = true;
            rules.best = true;
        }
    });
    sendData();
    updateSidebar(syllable);
    if (window.loadWords !== true) {
        window.loadWords = true;
        fetch(browser.runtime.getURL('words.txt'))
        .then(response => response.text())
        .then(data => {
            data.split('\n').forEach(word => {
                wordsList.push(word);
            })
        });
    }
});

const sendData = () => {
    browser.runtime.sendMessage({
        action: 'initialization',
    });
}

const setRules = () => {
    [rules.short, rules.average, rules.long, rules.best] = [
        document.getElementById('btncheck1').checked,
        document.getElementById('btncheck2').checked,
        document.getElementById('btncheck3').checked,
        document.getElementById('btncheck4').checked
    ];
    browser.storage.local.set({
        short: rules.short,
        average: rules.average,
        long: rules.long,
        best: rules.best
    });
}

start_btn.addEventListener('click', () => {
    setRules();
    sendData();
    updateSidebar(syllable);
});

const selectRandomWords = (active, currBound) => {
    const tmp = active.filter(word => word.length >= currBound[0] && word.length <= currBound[1])
    .sort(() => 0.5 - Math.random());
    return tmp.slice(0, 15).sort((a,b) => a.length-b.length).join(' ').trim();
}

const findBestWords = (active) => {
    let res = '';
    active.map(word => {
        const curr = new Set();
        const n = word.length;
        let count = 0;
        for (let i = 0; i < n; i++) {
            // Avoid double counting letters
            if (curr.has(word[i])) {
                continue;
            }
            // Increment count - # of uniques letters in word that are bonus letters 
            if (bonusLetters.has(word[i])) {
                count++;
            }
            // Add the current letter to a set to prevent double counting
            curr.add(word[i]);
        }
        return { word, count };
    }).sort((a,b) => {
        // If the bonus letter count is equal, return the word with the shorter length
        if (a.count === b.count) {
            return a.word.length - b.word.length;
        }
        // Get the word with the most distinct bonus letters
        return b.count - a.count;
    }).slice(0,10).forEach((elm,index) => {
        // Add the word to the output
        res += (elm.count ? elm.word : `<span class="red">${elm.word}</span>`) + ' ';
    });
    return res.trim();
}

const updateSidebar = (syllable) => {
    if (!syllable) {
        best.style.display = 'none';
        short.style.display = 'none';
        average.style.display = 'none';
        long.style.display = 'none';
        return;
    }
    syllable_elm.innerHTML = syllable;    
    const active = wordsList.filter(elm => elm.includes(syllable));
    if (rules.best) {
        best.lastElementChild.innerHTML = findBestWords(active) || '😟';
        best.style.display = 'flex';
    } else {
        best.style.display = 'none';
    }
    if (rules.short) {
        short.lastElementChild.innerHTML = selectRandomWords(active, bounds.short) || '😟';
        short.style.display = 'flex';
    } else {
        short.style.display = 'none';
    }
    if (rules.average) {
        average.lastElementChild.innerHTML = selectRandomWords(active, bounds.average) || '😟';
        average.style.display = 'flex';
    } else {
        average.style.display = 'none';
    }
    if (rules.long) {
        long.lastElementChild.innerHTML = selectRandomWords(active, bounds.long) || '😟';
        long.style.display = 'flex';
    } else {
        long.style.display = 'none';
    }
}

browser.runtime.onMessage.addListener(message => {
    if (message.action === 'syllable') {
        syllable = message.data.toLowerCase();
        updateSidebar(syllable);
    } else if (message.action === 'alphabet') {
        const letters = message.data.split('');
        if (!letters) {
            return;
        }
        bonusLetters.clear();
        for (const letter of letters) {
            bonusLetters.add(letter);
        }
        updateSidebar(syllable);
    }
});