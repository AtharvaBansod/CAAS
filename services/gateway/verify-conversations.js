const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n') : 'change_this_in_production_please';

function generateToken(userId, tenantId = 'tenant-1') {
    const payload = {
        sub: userId,
        id: userId,
        user_id: userId,
        tenantId: tenantId,
        tenant_id: tenantId,
        email: `user-${userId}@example.com`,
        roles: ['user'],
        permissions: ['create', 'read', 'update', 'delete']
    };
    if (process.env.JWT_PRIVATE_KEY) {
        return jwt.sign(payload, JWT_PRIVATE_KEY, { algorithm: 'RS256', expiresIn: '1h' });
    } else {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    }
}

const user1Token = generateToken('user-1');
const user2Token = generateToken('user-2');
const user3Token = generateToken('user-3'); // Admin/Mod tester

async function request(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        if (body) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : null);
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    try {
                        reject({ status: res.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        reject({ status: res.statusCode, data });
                    }
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('Starting conversation verification...');
    await sleep(2000); // Wait a bit for services to settle

    try {
        // 1. Create a direct conversation
        console.log('[CONV-001] Creating direct conversation...');
        const directConv = await request('POST', '/v1/conversations', user1Token, {
            type: 'direct',
            participant_ids: ['user-2'],
            initial_message_content: 'Hello!'
        });
        console.log('Direct conversation created:', directConv._id);

        // 2. List conversations
        console.log('[CONV-002] Listing conversations for user 1...');
        const list1 = await request('GET', '/v1/conversations', user1Token);
        if (!list1.data || list1.data.length === 0) throw new Error('List failed');
        console.log(`User 1 has ${list1.data.length} conversations.`);

        // 3. Get details
        console.log('[CONV-003] Getting conversation details...');
        await request('GET', `/v1/conversations/${directConv._id}`, user1Token);
        console.log('Details retrieved.');

        // 4. Create Group
        console.log('[CONV-001] Creating group conversation...');
        const groupConv = await request('POST', '/v1/conversations', user1Token, {
            type: 'group',
            participant_ids: ['user-2'],
            name: 'Test Group'
        });
        console.log('Group conversation created:', groupConv._id);

        // 5. Add Members (CONV-004)
        console.log('[CONV-004] Adding member user-3...');
        await request('POST', `/v1/conversations/${groupConv._id}/members`, user1Token, {
            member_ids: ['user-3']
        });
        console.log('Member added.');

        // 6. Update Member Role (CONV-006)
        console.log('[CONV-006] Updating user-3 to admin...');
        await request('PUT', `/v1/conversations/${groupConv._id}/members/user-3/role`, user1Token, {
            role: 'admin'
        });
        console.log('Member role updated.');

        // 7. Remove Member (CONV-005)
        console.log('[CONV-005] Removing user-2...');
        await request('DELETE', `/v1/conversations/${groupConv._id}/members/user-2`, user1Token);
        console.log('Member removed.');

        // 8. Create Invite Link (CONV-007)
        console.log('[CONV-007] Creating invite link...');
        const invite = await request('POST', `/v1/conversations/${groupConv._id}/invites`, user1Token, {
            max_uses: 5
        });
        console.log('Invite link created:', invite.code);

        // 9. Join via Invite (CONV-008)
        // User-2 was removed, let's try to join via link
        console.log('[CONV-008] User-2 joining via invite...');
        await request('POST', `/v1/conversations/join/${invite.code}`, user2Token, {});
        console.log('User-2 joined via invite.');

        // 10. Mute (CONV-009)
        console.log('[CONV-009] Muting conversation...');
        await request('POST', `/v1/conversations/${groupConv._id}/mute`, user1Token, { duration: 3600 });
        console.log('Muted.');

        // 11. Archive (CONV-010)
        console.log('[CONV-010] Archiving conversation...');
        await request('POST', `/v1/conversations/${groupConv._id}/archive`, user1Token);
        console.log('Archived.');

        // 12. Pin (CONV-011)
        console.log('[CONV-011] Pinning conversation...');
        await request('POST', `/v1/conversations/${groupConv._id}/pin`, user1Token);
        console.log('Pinned.');

        // 13. Moderation - Ban (Admin only)
        // User-1 is creator (admin). Let's ban User-2.
        console.log('[Admin] Banning User-2...');
        await request('POST', `/v1/conversations/${groupConv._id}/ban/user-2`, user1Token, { user_id: 'user-2', reason: 'Spam' });
        console.log('User-2 banned.');

        // 14. Leave (CONV-012/Delete)
        console.log('[CONV-012] User-3 leaving group...');
        await request('POST', `/v1/conversations/${groupConv._id}/leave`, user3Token, {});
        console.log('User-3 left.');

        console.log('ALL VERIFICATIONS PASSED SUCCESSFULY');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Wait for service to be ready
setTimeout(runTests, 2000);
