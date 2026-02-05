const http = require('http');

const runTest = async () => {
    console.log("--- TEST USERS RESOURCE ---");

    // 1. CREATE USER
    console.log("\n1. creating user 'john_doe'...");
    const postData = JSON.stringify({
        username: "john_doe",
        password: "secretpassword",
        email: "john@example.com"
    });

    const createReq = http.request({
        hostname: 'localhost',
        port: 8800,
        path: '/users',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Create Response Code:", res.statusCode);
            const user = JSON.parse(data);
            console.log("Created User (Should NOT have password):", user);
            if (user.password) console.error("!!! FATAL: PASSWORD LEAKED !!!");

            if (user.id) {
                const userId = user.id;

                // 2. GET USER
                console.log(`\n2. Getting user ${userId}...`);
                http.get(`http://localhost:8800/users/${userId}`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log("Get User Response:", JSON.parse(data));

                        // 3. PATCH USER (Update email)
                        console.log(`\n3. Patching user email...`);
                        const patchData = JSON.stringify({ email: "john_new@example.com" });
                        const patchReq = http.request({
                            hostname: 'localhost',
                            port: 8800,
                            path: `/users/${userId}`,
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Content-Length': patchData.length }
                        }, res => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                console.log("Patch Response:", JSON.parse(data));

                                // 4. DELETE USER
                                console.log(`\n4. Deleting user ${userId}...`);
                                const delReq = http.request({
                                    hostname: 'localhost',
                                    port: 8800,
                                    path: `/users/${userId}`,
                                    method: 'DELETE'
                                }, res => {
                                    let data = '';
                                    res.on('data', chunk => data += chunk);
                                    res.on('end', () => {
                                        console.log("Delete Response:", JSON.parse(data));
                                        console.log("\n--- TEST COMPLETE ---");
                                    });
                                });
                                delReq.end();
                            });
                        });
                        patchReq.write(patchData);
                        patchReq.end();
                    });
                });
            }
        });
    });

    createReq.write(postData);
    createReq.end();
};

// Wait for server to potentially restart if needed, though this is a manual script
setTimeout(runTest, 2000);
