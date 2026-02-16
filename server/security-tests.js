const http = require('http');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data,
                    json: () => {
                        try { return JSON.parse(data); }
                        catch (e) { return null; }
                    },
                    text: () => data
                });
            });
        });

        req.on('error', (e) => reject(e));

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

const BASE_URL = ''; // Logic moved to makeRequest

async function testAuthProtection() {
    console.log('\n🔍 [測試 1] 權限驗證 (Authentication)');

    try {
        const res = await makeRequest('/generate', 'POST', JSON.stringify({}));

        console.log(`POST /api/generate (無 Token): Status ${res.status}`);
        if (res.status === 401) {
            console.log('✅ 通過: 未授權請求被拒絕');
        } else {
            console.log('❌ 失敗: 未授權請求未被拒絕');
            console.log(`   Status: ${res.status}`);
            console.log(`   Body: ${res.body}`);
        }

    } catch (error) {
        console.error('測試執行錯誤:', error.message);
    }
}

async function testRateLimit() {
    console.log('\n🔍 [測試 2] 頻率限制 (Rate Limiting)');

    try {
        // 訪問 /api/ (root)
        const res = await makeRequest('/');

        const limit = res.headers['x-ratelimit-limit'];
        const remaining = res.headers['x-ratelimit-remaining'];

        console.log(`Status: ${res.status}`);
        console.log(`X-RateLimit-Limit: ${limit}`);
        console.log(`X-RateLimit-Remaining: ${remaining}`);

        if (limit && remaining) {
            console.log('✅ 通過: 頻率限制標頭存在');
        } else {
            console.log('⚠️ 警告: 未檢測到頻率限制標頭');
        }
    } catch (error) {
        console.error('測試執行錯誤:', error.message);
    }
}

async function testErrorLeakage() {
    console.log('\n🔍 [測試 3] 錯誤處理與資訊洩漏 (Error Handling)');

    try {
        // 發送一個畸形的 JSON 導致解析錯誤，或者觸發後端錯誤
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/api/generate',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Malformed JSON Request: Status ${res.statusCode}`);
                // console.log(`Response Body: ${data.substring(0, 200)}...`);
                if (data.includes('SyntaxError') || data.includes('node_modules') || data.includes('at ')) {
                    console.log('❌ 失敗: 回應包含堆疊追蹤或詳細錯誤');
                    console.log('Preview:', data.substring(0, 100));
                } else {
                    console.log('✅ 通過: 回應未包含明顯的堆疊追蹤');
                }
            });
        });

        req.on('error', (e) => console.log('Req Error:', e.message));
        req.write('{ "invalid_json": '); // Malformed
        req.end();

    } catch (error) {
        console.log('執行錯誤:', error.message);
    }
}

async function run() {
    console.log('🚀 開始 API 安全性測試...');
    await testAuthProtection();
    await testRateLimit();
    await testErrorLeakage();
    // wait for async request inside testErrorLeakage which is using raw http.request callback
    setTimeout(() => console.log('\n測試結束。'), 2000);
}

run();
