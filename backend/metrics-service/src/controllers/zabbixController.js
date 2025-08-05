// backend/metrics-service/src/controllers/zabbixController.js
const axios = require('axios');
const logger = require('../config/logger');

// Vérification des variables d'environnement nécessaires
if (!process.env.ZABBIX_URL || !process.env.ZABBIX_USER || !process.env.ZABBIX_PASSWORD) {
    logger.fatal('Variables d\'environnement Zabbix manquantes. Vérifiez ZABBIX_URL, ZABBIX_USER, ZABBIX_PASSWORD');
    logger.info(`ZABBIX_URL=${process.env.ZABBIX_URL}`);
    logger.info(`ZABBIX_USER=${process.env.ZABBIX_USER}`);
    // Ne pas logger le mot de passe, juste sa présence
    logger.info(`ZABBIX_PASSWORD est ${process.env.ZABBIX_PASSWORD ? 'défini' : 'non défini'}`);
}

// Classe utilitaire pour interagir avec l'API Zabbix
class ZabbixAPI {
    constructor() {
        this.auth = null;
        this.requestId = 1;
    }

    async login() {
        try {
            logger.info(`Tentative de connexion à Zabbix (${process.env.ZABBIX_URL})...`);
            
            const response = await axios.post(process.env.ZABBIX_URL, {
                jsonrpc: '2.0',
                method: 'user.login',
                params: {
                    username: process.env.ZABBIX_USER,
                    password: process.env.ZABBIX_PASSWORD
                },
                id: this.requestId++
            });

            if (response.data.error) {
                throw new Error(`Zabbix API error: ${JSON.stringify(response.data.error)}`);
            }

            this.auth = response.data.result;
            logger.info('Connexion à Zabbix réussie.');
            return this.auth;
        } catch (error) {
            if (error.response && error.response.data) {
                logger.error(`Erreur de réponse Zabbix: ${JSON.stringify(error.response.data)}`);
            } else {
                logger.error(error, 'Erreur lors de la connexion à Zabbix');
            }
            throw error;
        }
    }

    async request(method, params = {}) {
        try {
            if (!this.auth) {
                await this.login();
            }

            // Utilisation de l'en-tête Authorization pour l'authentification
            const response = await axios.post(
                process.env.ZABBIX_URL, 
                {
                    jsonrpc: '2.0',
                    method: method,
                    params: params,
                    id: this.requestId++
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.auth}`
                    }
                }
            );

            if (response.data.error) {
                throw new Error(`Zabbix API error: ${JSON.stringify(response.data.error)}`);
            }

            return response.data.result;
        } catch (error) {
            if (error.response && error.response.data) {
                logger.error(`Erreur de réponse Zabbix (${method}): ${JSON.stringify(error.response.data)}`);
            } else {
                logger.error(error, `Erreur lors de l'appel à la méthode ${method}`);
            }
            throw error;
        }
    }

    // Pas besoin de logout explicite car nous utilisons l'authentification par en-tête
}

// Création d'une instance de ZabbixAPI
const zabbixAPI = new ZabbixAPI();

// Contrôleurs pour les routes
const getZabbixHosts = async (req, res, next) => {
    try {
        const hosts = await zabbixAPI.request('host.get', {
            output: 'extend', // Demande tous les champs disponibles pour l'hôte
            selectInterfaces: 'extend', // Demande tous les champs pour les interfaces
            selectInventory: 'extend', // Récupérer l'inventaire
            selectTags: 'extend', // Récupérer les tags
            selectGroups: 'extend', // Récupérer les groupes
        });
        
        // Log détaillé pour comprendre la structure des données
        logger.info(`${hosts.length} hôtes récupérés de Zabbix`);
        logger.info(`Structure du premier hôte: ${JSON.stringify(hosts[0])}`);
        
        res.json(hosts);
    } catch (error) {
        next(error);
    }
};

const getZabbixItemsForHost = async (req, res, next) => {
    const { hostid } = req.params;
    try {
        if (!hostid) {
            return res.status(400).json({ message: "L'ID de l'hôte est requis" });
        }

        const items = await zabbixAPI.request('item.get', {
            output: 'extend', // Récupère tous les champs disponibles pour l'item
            hostids: hostid,
            sortfield: 'name'
        });
        
        logger.info(`${items.length} items récupérés pour l'hôte ${hostid}`);
        if (items.length > 0) {
            logger.info(`Structure du premier item pour l'hôte ${hostid}: ${JSON.stringify(items[0])}`);
        }
        res.json(items);
    } catch (error) {
        next(error);
    }
};

const getZabbixProblems = async (req, res, next) => {
    try {
        const problems = await zabbixAPI.request('problem.get', {
            output: 'extend',
            selectAcknowledges: 'extend',
            selectTags: 'extend',
            // Le paramètre selectHosts n'est pas supporté par l'API Zabbix
            recent: true, // Uniquement les problèmes récents
            sortfield: ['eventid'],
            sortorder: 'DESC'
        });
        
        logger.info(`${problems.length} problèmes récupérés de Zabbix`);
        if (problems.length > 0) {
            logger.info(`Structure du premier problème: ${JSON.stringify(problems[0])}`);
        }
        res.json(problems);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getZabbixHosts,
    getZabbixItemsForHost,
    getZabbixProblems
};