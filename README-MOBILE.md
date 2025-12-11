# Test de l'application Météo sur Mobile

## Problème résolu
✅ Chemins absolus corrigés en chemins relatifs
✅ CSS responsive ajouté pour mobile
✅ Zones tactiles optimisées (44px minimum)
✅ Gestionnaire d'erreurs global ajouté

## Pour tester sur mobile :

### Option 1 : Utiliser ngrok (Recommandé)
1. Téléchargez ngrok : https://ngrok.com/download
2. Démarrez votre serveur local : `python -m http.server 8000`
3. Dans un nouveau terminal : `ngrok http 8000`
4. Utilisez l'URL HTTPS fournie (ex: https://xxxx.ngrok.io) sur votre mobile

### Option 2 : Utiliser votre IP locale (même WiFi)
1. Trouvez votre IP locale : `ipconfig` (Windows) - cherchez "Adresse IPv4"
2. Démarrez le serveur : `python -m http.server 8000`
3. Sur votre mobile (connecté au même WiFi), allez sur : `http://VOTRE_IP:8000`
   Exemple : `http://192.168.1.10:8000`
   
⚠️ **Note** : Sans HTTPS, les notifications et le service worker ne fonctionneront pas sur mobile

### Option 3 : Déployer en ligne
Hébergez gratuitement sur :
- **GitHub Pages** (avec HTTPS automatique)
- **Netlify** (drag & drop)
- **Vercel** (gratuit, HTTPS automatique)

## Vérifications sur mobile :
1. Ouvrir la console mobile (Chrome DevTools via USB)
2. Vérifier que le service worker s'enregistre
3. Tester la recherche de ville
4. Vérifier les prévisions horaires
5. Tester l'ajout aux favoris
6. Tester le changement de thème

## Débogage sur mobile :
- Chrome : chrome://inspect sur PC + câble USB
- Safari iOS : Développer > [Votre iPhone] sur Mac
