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

/**
 * Classe utilitaire pour interagir avec l'API Zabbix
 * Gère l'authentification et les requêtes vers l'API JSON-RPC de Zabbix
 */
class ZabbixAPI {
    constructor() {
        this.auth = null;
        this.requestId = 1;
    }

    /**
     * S'authentifie auprès de l'API Zabbix
     * @returns {Promise<string>} Token d'authentification
     */
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

    /**
     * Exécute une requête vers l'API Zabbix
     * @param {string} method - Méthode de l'API Zabbix (à appeler)
     * @param {Object} params - Paramètres de la requête
     * @returns {Promise<any>} Résultat de l'API Zabbix
     */
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

/**
 * Récupère la liste des hôtes depuis Zabbix
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Liste des hôtes Zabbix
 */
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

/**
 * Récupère tous les items (métriques) d'un hôte spécifique
 * @param {import('express').Request} req - Requête avec params.hostid
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Liste des items Zabbix pour l'hôte
 */
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

/**
 * Récupère tous les problèmes/alertes actifs de Zabbix
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Liste des problèmes avec détails
 */
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

/**
 * Génère un résumé des hôtes (total, en ligne, hors ligne)
 * @param {import('express').Request} req - Requête Express
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Statistiques des hôtes
 */
const getHostsSummary = async (req, res, next) => {
    try {
        const hosts = await zabbixAPI.request('host.get', {
            output: ['hostid', 'name', 'status', 'available', 'snmp_available', 'jmx_available', 'ipmi_available'],
        });

        const total = hosts.length;
        const online = hosts.filter((h) => {
            const enabled = h.status === '0';
            const anyAvailable = (h.available === '1') || (h.snmp_available === '1') || (h.jmx_available === '1') || (h.ipmi_available === '1');
            return enabled && anyAvailable;
        }).length;
        const offline = Math.max(0, total - online);

        res.json({ total, online, offline, updatedAt: new Date().toISOString() });
    } catch (error) {
        next(error);
    }
};

/**
 * Récupère les top items numériques d'un hôte
 * @param {import('express').Request} req - Requête avec params.hostid et query.limit
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Top items avec valeurs et unités
 */
const getTopItemsForHost = async (req, res, next) => {
    const { hostid } = req.params;
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '5', 10), 20));
    try {
        if (!hostid) {
            return res.status(400).json({ message: "L'ID de l'hôte est requis" });
        }
        const items = await zabbixAPI.request('item.get', {
            output: ['itemid', 'hostid', 'name', 'key_', 'lastvalue', 'units', 'lastclock', 'value_type'],
            hostids: hostid,
            sortfield: 'name',
        });

        const numeric = items
            .filter((it) => it.lastvalue !== undefined && it.lastvalue !== null && `${it.lastvalue}`.trim() !== '' && !isNaN(Number(it.lastvalue)))
            .map((it) => ({
                itemid: it.itemid,
                hostid: it.hostid,
                name: it.name,
                key_: it.key_,
                units: it.units,
                lastvalue: it.lastvalue,
                lastclock: it.lastclock,
            }))
            .sort((a, b) => Number(b.lastvalue) - Number(a.lastvalue))
            .slice(0, limit);

        res.json(numeric);
    } catch (error) {
        next(error);
    }
};

/**
 * Récupère l'historique d'un item Zabbix (données temporelles)
 * @param {import('express').Request} req - Requête avec params.itemid et query.{from, to, limit}
 * @param {import('express').Response} res - Réponse Express
 * @param {import('express').NextFunction} next - Fonction middleware suivante
 * @returns {Promise<void>} Données historiques de l'item
 */
const getItemHistory = async (req, res, next) => {
    const { itemid } = req.params;
    const { from, to, limit } = req.query;
    try {
        if (!itemid) {
            return res.status(400).json({ message: "L'ID de l'item est requis" });
        }

        // Récupérer l'item pour déterminer le type d'historique
        const items = await zabbixAPI.request('item.get', {
            output: ['itemid', 'value_type'],
            itemids: [itemid],
        });
        if (!items || items.length === 0) {
            return res.status(404).json({ message: "Item introuvable" });
        }
        const valueType = items[0].value_type; // '0' float, '3' unsigned, autres non numériques

        // Mapper vers le paramètre history attendu par history.get
        // 0: numeric float, 1: character, 2: log, 3: numeric unsigned, 4: text
        const numericTypes = ['0', '3'];
        const historyType = numericTypes.includes(String(valueType)) ? Number(valueType) : 0;

        const time_from = from ? Number(from) : Math.floor(Date.now() / 1000) - 3600; // 1h par défaut
        const time_till = to ? Number(to) : Math.floor(Date.now() / 1000);
        const max = Math.min(Number(limit || 500), 2000);

        const history = await zabbixAPI.request('history.get', {
            output: 'extend',
            history: historyType,
            itemids: [itemid],
            time_from,
            time_till,
            sortfield: 'clock',
            sortorder: 'ASC',
            limit: max,
        });

        // Normaliser la réponse (clock, value)
        const normalized = (history || []).map((h) => ({
            clock: String(h.clock),
            value: String(h.value),
        }));
        res.json(normalized);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getZabbixHosts,
    getZabbixItemsForHost,
    getZabbixProblems,
    getHostsSummary,
    getTopItemsForHost,
    getItemHistory,
};