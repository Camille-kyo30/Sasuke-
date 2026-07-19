const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Initialisation de la table avec toutes les colonnes nécessaires
db.prepare(`CREATE TABLE IF NOT EXISTS mafia (
    userId TEXT PRIMARY KEY,
    power INTEGER DEFAULT 10,
    money INTEGER DEFAULT 0,
    clan TEXT DEFAULT 'Aucun',
    threat_level INTEGER DEFAULT 1,
    isPremium INTEGER DEFAULT 0,
    lastDaily TEXT DEFAULT '0',
    lastBraquage TEXT DEFAULT '0',
    lastClanAttack TEXT DEFAULT '0',
    protectionEnd TEXT DEFAULT '0',
    malfrats INTEGER DEFAULT 0,
    tireurs INTEGER DEFAULT 0,
    motards INTEGER DEFAULT 0,
    vehicules INTEGER DEFAULT 0
)`).run();

const nix = {
  name: "mafia",
  version: "6.0.0",
  description: "The Grand Mafia : Système complet",
  author: "Camille",
  prefix: true,
  category: "Game",
  type: "anyone",
  cooldown: 3,
  guide: "/mafia <stats|lore|daily|premium|recruit|attack|scan|clan|clanattack|notify|top|braquage|protection>"
};

async function onStart({ message, args, userId }) {
  const subcmd = args[0]?.toLowerCase();
  db.prepare("INSERT OR IGNORE INTO mafia (userId) VALUES (?)").run(String(userId));
  let m = db.prepare("SELECT * FROM mafia WHERE userId = ?").get(String(userId));

  switch(subcmd) {
    case 'lore':
      message.reply(`🕶️ **THE GRAND MAFIA : DOMINEZ LA PÈGRE** 🕶️
Depuis la mort du précédent parrain, la Famille n'a plus de chef. **C'est à vous de prendre le contrôle.**

☆ **Contrôlez la pègre** : Faites vos lois et imposez votre charisme.
☆ **Gangs & Véhicules** : Gérez vos unités avec stratégie.
☆ **Événements de faction** : Unissez-vous pour renverser le gouvernement.
☆ **Stratégie & Investissement** : Développez votre empire et personnalisez votre quartier.
☆ **Combats & Tournois** : Duels tactiques ou invasions massives.

*Construisez, investissez, rencardez, et dominez. Votre destinée dépend de vos actions.*`);
      break;

    case 'stats':
      const threatColor = m.threat_level > 5 ? "🔴" : "🟢";
      const status = m.isPremium ? "⭐ PREMIUM" : "👤 Membre";
      message.reply(`╔══════════════════════════════╗
   🕶️ **ETAT DE LA FAMILLE** [${status}]
╠══════════════════════════════╣
   💪 Puissance   : ${m.power}
   💰 Trésorerie  : ${m.money}$
   🔥 Menace      : ${threatColor} Niveau ${m.threat_level}
   🤝 Clan        : ${m.clan}
╚══════════════════════════════╝`);
      break;

    case 'daily':
      const today = new Date().toISOString().split('T')[0];
      if (m.lastDaily === today) return message.reply("❌ Récompense déjà réclamée !");
      const reward = m.isPremium ? 2000 : 1000;
      db.prepare("UPDATE mafia SET money = money + ?, lastDaily = ? WHERE userId = ?").run(reward, today, String(userId));
      message.reply(`🎁 **Récompense :** Tu as reçu ${reward}$ !`);
      break;

    case 'premium':
      if (args[1] === 'buy') {
        if (m.isPremium) return message.reply("⭐ Tu es déjà PREMIUM.");
        if (m.money < 50000) return message.reply("❌ Coût Premium : 50 000$.");
        db.prepare("UPDATE mafia SET money = money - 50000, isPremium = 1 WHERE userId = ?").run(String(userId));
        message.reply("💎 **Félicitations !** Tu es PREMIUM.");
      } else {
        message.reply("⭐ **Statut Premium** (50 000$) : Récompenses x2, Attaque + facile, Recrutement - cher, Braquage exclusif, Bouclier.");
      }
      break;

    case 'recruit':
      const cost = m.isPremium ? 150 : 200;
      if (m.money < cost) return message.reply(`❌ Il te faut ${cost}$ !`);
      db.prepare("UPDATE mafia SET money = money - ?, malfrats = malfrats + 1, power = power + 20 WHERE userId = ?").run(cost, String(userId));
      message.reply("🔥 **Recrutement réussi !**");
      break;

    case 'attack':
      const target = db.prepare("SELECT * FROM mafia WHERE userId = ?").get(args[1]);
      if (!target) return message.reply("❌ Cible introuvable.");
      if (Date.now() < parseInt(target.protectionEnd || 0)) return message.reply("🛡️ **Cible protégée !**");
      const winChance = m.isPremium ? 0.25 : 0.4;
      if (Math.random() > winChance) {
        db.prepare("UPDATE mafia SET money = money + 500, threat_level = threat_level + 1 WHERE userId = ?").run(String(userId));
        message.reply("⚔️ **VICTOIRE !** +500$.");
      } else {
        db.prepare("UPDATE mafia SET power = power - 5 WHERE userId = ?").run(String(userId));
        message.reply("💥 **DÉFAITE !** -5 puissance.");
      }
      break;

    case 'clanattack':
      if (m.clan === 'Aucun') return message.reply("❌ Aucun clan trouvé.");
      const tId = args[1];
      if (!tId) return message.reply("❌ Qui cibler ?");
      const now = Date.now();
      if (now - parseInt(m.lastClanAttack || 0) < 21600000) return message.reply("⏳ **Repos :** Ton clan doit attendre 6h.");
      const targetC = db.prepare("SELECT * FROM mafia WHERE userId = ?").get(tId);
      if (!targetC || Date.now() < parseInt(targetC.protectionEnd || 0)) return message.reply("🛡️ **Cible introuvable ou protégée.**");
      const clanPower = db.prepare("SELECT SUM(power) as total FROM mafia WHERE clan = ?").get(m.clan).total;
      if (clanPower > targetC.power) {
        db.prepare("UPDATE mafia SET money = money + 2000, lastClanAttack = ? WHERE clan = ?").run(now, m.clan);
        message.reply(`⚔️ **RAID RÉUSSI !** La famille ${m.clan} a gagné.`);
      } else {
        db.prepare("UPDATE mafia SET lastClanAttack = ? WHERE clan = ?").run(now, m.clan);
        message.reply("💥 **ÉCHEC DU RAID !** Cible trop forte.");
      }
      break;

    case 'braquage':
      if (!m.isPremium) return message.reply("🔒 Réservé aux PREMIUM.");
      if (Date.now() - parseInt(m.lastBraquage || 0) < 14400000) return message.reply("⏳ Attends 4h.");
      if (Math.random() > 0.5) {
        db.prepare("UPDATE mafia SET money = money + 5000, lastBraquage = ? WHERE userId = ?").run(Date.now(), String(userId));
        message.reply("💰 **BRAQUAGE RÉUSSI :** +5 000$.");
      } else {
        db.prepare("UPDATE mafia SET power = power - 20, lastBraquage = ? WHERE userId = ?").run(Date.now(), String(userId));
        message.reply("🚨 **ÉCHEC :** -20 puissance.");
      }
      break;

    case 'protection':
      if (!m.isPremium) return message.reply("🔒 Réservé aux PREMIUM.");
      db.prepare("UPDATE mafia SET protectionEnd = ? WHERE userId = ?").run(Date.now() + 3600000, String(userId));
      message.reply("🛡️ **BOUCLIER ACTIVÉ :** Intouchable pendant 1h !");
      break;

    default:
      message.reply(`🕶️ **THE GRAND MAFIA**\n/mafia <stats|lore|recruit|attack|scan|daily|premium|braquage|protection|clanattack>`);
  }
}

module.exports = { nix, onStart };
