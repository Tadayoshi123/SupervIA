# Guide de Configuration Manuelle de Zabbix pour SupervIA

Ce document décrit les étapes nécessaires pour configurer l'auto-enregistrement (auto-registration) des agents Zabbix après le premier déploiement de l'infrastructure SupervIA via `docker-compose up`.

## Contexte

Après le déploiement, le serveur Zabbix est opérationnel, mais il ne sait pas encore comment gérer les nouveaux agents qui tentent de se connecter. La procédure suivante permet de créer une règle qui enregistrera, configurera et commencera automatiquement la surveillance de tout nouvel agent Zabbix.

---

## Étapes de Configuration

### 1. Accéder à l'interface Web de Zabbix

-   Ouvrez votre navigateur et rendez-vous à l'adresse : [http://localhost:8081](http://localhost:8081)
-   Connectez-vous avec les identifiants par défaut (configurés dans `docker-compose.yml`) :
    -   **Username** : `Admin`
    -   **Password** : `[CONFIGURER_VIA_ENV]`

### 2. Créer une Action d'Auto-enregistrement

Une fois connecté, suivez ces étapes pour créer l'action :

1.  Dans le menu de gauche, naviguez vers **Alerts** -> **Actions**.
2.  En haut à droite de l'écran, cliquez sur le menu déroulant qui affiche "Trigger actions" et sélectionnez **Autoregistration actions**.
3.  Cliquez sur le bouton **Create action** en haut à droite.

### 3. Configurer l'Action

Vous êtes maintenant sur la page de création de l'action. Remplissez les champs comme suit :

#### Onglet "Action"

-   **Name** : Donnez un nom explicite à l'action. Par exemple : `Enregistrement automatique des agents Docker`.
-   Laissez les autres champs par défaut.

#### Onglet "Operations"

C'est ici que vous définissez ce qui se passe lorsqu'un nouvel agent est détecté. Ajoutez les opérations suivantes en cliquant sur le lien **Add** dans le bloc "Operations".

1.  **Ajouter l'hôte (Add host)** :
    -   **Operation type** : `Add host`
    -   Cette opération simple indique à Zabbix d'enregistrer le nouvel agent comme un hôte.

2.  **Ajouter l'hôte à un groupe (Add to host group)** :
    -   Cliquez de nouveau sur **Add**.
    -   **Operation type** : `Add to host group`
    -   **Host groups** : Sélectionnez `Linux servers` (ou tout autre groupe pertinent).

3.  **Lier un modèle de surveillance (Link to template)** :
    -   Cliquez une dernière fois sur **Add**.
    -   **Operation type** : `Link to template`
    -   **Templates** : Recherchez et sélectionnez les modèles suivants :
        -   `Linux by Zabbix agent`
        -   `Zabbix server health`

Une fois les trois opérations ajoutées, votre configuration devrait ressembler à ceci :

![Exemple de configuration des opérations](https://i.imgur.com/your-image-placeholder.png) <!-- Remplacez par une capture d'écran si possible -->

### 4. Valider et Appliquer l'Action

-   Cliquez sur le bouton bleu **Add** en bas du formulaire pour sauvegarder votre nouvelle action.
-   Assurez-vous que l'action est bien activée (`Enabled`) dans la liste des actions d'auto-enregistrement.

---

## Vérification Finale

L'agent Zabbix défini dans `docker-compose.yml` (`supervia_zabbix_agent`) devrait maintenant s'enregistrer automatiquement.

1.  Naviguez vers **Monitoring** -> **Hosts**.
2.  Vous devriez voir un nouvel hôte, potentiellement nommé **Docker Host** ou `supervia_zabbix_agent`.
3.  Dans la colonne **Availability**, l'icône ZBX devrait passer au vert après quelques instants, indiquant que la connexion est établie et que la surveillance est active.

Si l'hôte n'apparaît pas immédiatement, patientez une à deux minutes, le temps que l'agent retente une connexion et que le serveur applique l'action.