// test-zabbix-direct.js
const axios = require('axios');

const ZABBIX_URL = 'http://zabbix-web:8080/api_jsonrpc.php';
const ZABBIX_USER = 'Admin';
const ZABBIX_PASSWORD = 'zabbix';

async function testZabbixAPI() {
    try {
        console.log('Tentative de connexion à Zabbix...');
        
        // 1. Login - Selon la documentation
        const loginResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'user.login',
            params: {
                username: ZABBIX_USER,
                password: ZABBIX_PASSWORD
            },
            id: 1
        });

        if (loginResponse.data.error) {
            throw new Error(`Erreur de login: ${JSON.stringify(loginResponse.data.error)}`);
        }

        const authToken = loginResponse.data.result;
        console.log(`Connexion réussie. Token: ${authToken}`);

        // 2. Récupérer les hôtes
        console.log('Récupération des hôtes...');
        const hostsResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'host.get',
            params: {
                output: ['hostid', 'host', 'name', 'status'],
                selectInterfaces: ['ip']
            },
            auth: authToken,
            id: 2
        });

        if (hostsResponse.data.error) {
            throw new Error(`Erreur host.get: ${JSON.stringify(hostsResponse.data.error)}`);
        }

        const hosts = hostsResponse.data.result;
        console.log(`${hosts.length} hôtes trouvés:`);
        console.log(JSON.stringify(hosts, null, 2));

        // 3. Logout
        console.log('Déconnexion...');
        const logoutResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'user.logout',
            params: [],
            auth: authToken,
            id: 3
        });

        if (logoutResponse.data.error) {
            throw new Error(`Erreur de logout: ${JSON.stringify(logoutResponse.data.error)}`);
        }

        console.log('Déconnexion réussie.');

    } catch (error) {
        console.error('Erreur:', error.message);
        if (error.response) {
            console.error('Réponse d\'erreur:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testZabbixAPI();