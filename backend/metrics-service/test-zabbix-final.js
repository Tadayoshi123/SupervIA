// test-zabbix-final.js
const axios = require('axios');

const ZABBIX_URL = 'http://zabbix-web:8080/api_jsonrpc.php';
const ZABBIX_USER = 'Admin';
const ZABBIX_PASSWORD = 'zabbix';

async function testZabbixAPI() {
    try {
        console.log('Tentative de connexion à Zabbix...');
        
        // 1. Login - Combinaison des différentes approches
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

        // 2. Vérifier la version de l'API
        console.log('Vérification de la version de l\'API...');
        const versionResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'apiinfo.version',
            params: {},
            id: 2
        });

        if (versionResponse.data.error) {
            console.error(`Erreur apiinfo.version: ${JSON.stringify(versionResponse.data.error)}`);
        } else {
            console.log(`Version de l'API: ${versionResponse.data.result}`);
        }

        // 3. Récupérer les hôtes - Avec le token dans le corps principal
        console.log('Récupération des hôtes...');
        const hostsResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'host.get',
            params: {
                output: ['hostid', 'host', 'name', 'status'],
                selectInterfaces: ['ip']
            },
            auth: authToken,
            id: 3
        });

        if (hostsResponse.data.error) {
            console.error(`Erreur host.get: ${JSON.stringify(hostsResponse.data.error)}`);
        } else {
            const hosts = hostsResponse.data.result;
            console.log(`${hosts.length} hôtes trouvés:`);
            console.log(JSON.stringify(hosts, null, 2));
        }

        // 4. Logout
        console.log('Déconnexion...');
        const logoutResponse = await axios.post(ZABBIX_URL, {
            jsonrpc: '2.0',
            method: 'user.logout',
            params: {},
            auth: authToken,
            id: 4
        });

        if (logoutResponse.data.error) {
            console.error(`Erreur logout: ${JSON.stringify(logoutResponse.data.error)}`);
        } else {
            console.log('Déconnexion réussie.');
        }

    } catch (error) {
        console.error('Erreur:', error.message);
        if (error.response) {
            console.error('Réponse d\'erreur:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testZabbixAPI();