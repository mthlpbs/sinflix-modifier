const fs = require('fs');
const assert = require('assert');
const path = require('path');

const scriptPath = path.join(__dirname, '..', 'sinflix-modifier.user.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('--- Testing SinFlix Modifier Refresh & Credential Persistence ---');

// 1. Static validation of key elements
assert(scriptContent.includes('id="sfx-save-tmdb-btn"'), 'Save button must be present in Settings HTML');
assert(scriptContent.includes('id="sfx-save-tmdb-btn-text"'), 'Save button text must be present');
assert(scriptContent.includes('.sfx-settings-save-btn'), 'Save button CSS styling must exist');
assert(scriptContent.includes('saveTmdbCredentials'), 'saveTmdbCredentials function must exist');
assert(!scriptContent.includes('LEGACY_DEFAULT_TMDB_READ_TOKEN'), 'Legacy wipe token constant must be removed');
assert(!scriptContent.includes('LEGACY_DEFAULT_TMDB_API_KEY'), 'Legacy wipe api key constant must be removed');

// Verify multi-event binding
assert(scriptContent.includes("['input', 'change', 'blur', 'paste', 'keyup']"), 'Inputs must listen to all input/blur/paste/change events');
assert(scriptContent.includes("'beforeunload'"), 'beforeunload handler must be wired to flush uncommitted inputs');

console.log('✓ Static element & handler checks passed');

// 2. Dynamic persistence simulation
let gmStorage = {};
let lsStorage = {};

const mockGM_getValue = (key, d) => (key in gmStorage ? gmStorage[key] : d);
const mockGM_setValue = (key, val) => { gmStorage[key] = val; };
const mockLocalStorage = {
    getItem: (key) => (key in lsStorage ? lsStorage[key] : null),
    setItem: (key, val) => { lsStorage[key] = String(val); },
    removeItem: (key) => { delete lsStorage[key]; }
};

// Evaluate getSetting, setSetting, getTmdbCredentials in a sandbox
function createSandbox(gmAvailable = true, lsAvailable = true) {
    const context = {
        console,
        DEFAULT_TMDB_READ_TOKEN: '',
        DEFAULT_TMDB_API_KEY: '',
    };
    if (gmAvailable) {
        context.GM_getValue = mockGM_getValue;
        context.GM_setValue = mockGM_setValue;
    }
    if (lsAvailable) {
        context.localStorage = mockLocalStorage;
    }

    const getSettingCode = scriptContent.substring(
        scriptContent.indexOf('function getSetting'),
        scriptContent.indexOf('function setSetting')
    );
    const setSettingCode = scriptContent.substring(
        scriptContent.indexOf('function setSetting'),
        scriptContent.indexOf('function updateBackToTopVisibility')
    );
    const getTmdbCredsCode = scriptContent.substring(
        scriptContent.indexOf('function getTmdbCredentials'),
        scriptContent.indexOf('function makeSfxRequest')
    );

    const fnString = `
        ${getSettingCode}
        ${setSettingCode}
        ${getTmdbCredsCode}
        return { getSetting, setSetting, getTmdbCredentials };
    `;

    const factory = new Function(...Object.keys(context), fnString);
    return factory(...Object.values(context));
}

// Test Case 1: Saving credentials and simulating page refresh
{
    gmStorage = {};
    lsStorage = {};
    let runtime1 = createSandbox(true, true);
    
    // User saves credentials
    runtime1.setSetting('sfx-tmdb-read-token', 'Bearer user_jwt_access_token_xyz');
    runtime1.setSetting('sfx-tmdb-api-key', 'user_api_key_12345');

    // Page Refresh: simulate fresh runtime reload
    let runtime2 = createSandbox(true, true);
    let creds = runtime2.getTmdbCredentials();
    assert.strictEqual(creds.readToken, 'user_jwt_access_token_xyz', 'Read token should persist and strip Bearer prefix on reload');
    assert.strictEqual(creds.apiKey, 'user_api_key_12345', 'API key should persist across reload');
    console.log('✓ Test Case 1 Passed: Credentials persist across page reload');
}

// Test Case 2: GM storage lost / cleared, local storage fallback & heal
{
    // Wipe GM store, leave local storage
    gmStorage = {};
    assert(Object.keys(lsStorage).length > 0, 'lsStorage should have saved values');

    let runtimeFallback = createSandbox(true, true);
    let creds = runtimeFallback.getTmdbCredentials();
    assert.strictEqual(creds.readToken, 'user_jwt_access_token_xyz', 'Read token recovered from localStorage');
    assert.strictEqual(creds.apiKey, 'user_api_key_12345', 'API key recovered from localStorage');

    // Verify it healed GM storage
    assert.strictEqual(gmStorage['sfx-tmdb-read-token'], 'Bearer user_jwt_access_token_xyz', 'GM storage healed from localStorage');
    console.log('✓ Test Case 2 Passed: Fallback to localStorage and self-healing to GM storage works');
}

// Test Case 3: Local storage lost / cleared, GM storage fallback & heal
{
    // Wipe local storage, leave GM store
    lsStorage = {};
    let runtimeGm = createSandbox(true, true);
    let creds = runtimeGm.getTmdbCredentials();
    assert.strictEqual(creds.readToken, 'user_jwt_access_token_xyz', 'Read token retrieved from GM');

    // Verify it healed localStorage
    assert(lsStorage['sfx-tmdb-read-token'].includes('user_jwt_access_token_xyz'), 'localStorage healed from GM');
    console.log('✓ Test Case 3 Passed: Self-healing to localStorage works');
}

// Test Case 4: Multiple refreshes with various tokens
{
    for (let i = 1; i <= 5; i++) {
        let rt = createSandbox(true, true);
        rt.setSetting('sfx-tmdb-read-token', `token_iteration_${i}`);
        rt.setSetting('sfx-tmdb-api-key', `api_key_iteration_${i}`);

        // Simulate reload
        let rtReloaded = createSandbox(true, true);
        let c = rtReloaded.getTmdbCredentials();
        assert.strictEqual(c.readToken, `token_iteration_${i}`);
        assert.strictEqual(c.apiKey, `api_key_iteration_${i}`);
    }
    console.log('✓ Test Case 4 Passed: Repeated reloads maintain persistence accurately');
}

console.log('All credential persistence and refresh tests PASSED perfectly!');
