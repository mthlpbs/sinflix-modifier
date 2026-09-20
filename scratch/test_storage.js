// Test storage simulation
let gmStore = {};
const GM_getValue = (k, d) => (k in gmStore ? gmStore[k] : d);
const GM_setValue = (k, v) => { gmStore[k] = v; };

function getSettingGM(key, defaultValue) {
    if (typeof GM_getValue !== 'undefined') {
        return GM_getValue(key, defaultValue);
    }
    return defaultValue;
}

function setSettingGM(key, value) {
    if (typeof GM_setValue !== 'undefined') {
        GM_setValue(key, value);
    }
}

// Test setting and getting
setSettingGM('sfx-tmdb-read-token', 'test_token_123');
console.log('GM test:', getSettingGM('sfx-tmdb-read-token', ''));

// What if GM_setValue is NOT available, only localStorage?
let lsStore = {};
const localStorage = {
    getItem: (k) => lsStore[k] || null,
    setItem: (k, v) => { lsStore[k] = String(v); }
};

function getSettingLS(key, defaultValue) {
    const val = localStorage.getItem(key);
    return val !== null ? JSON.parse(val) : defaultValue;
}

function setSettingLS(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

setSettingLS('sfx-tmdb-read-token', 'test_token_456');
console.log('LS test:', getSettingLS('sfx-tmdb-read-token', ''));
