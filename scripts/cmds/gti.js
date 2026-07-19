const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

// Initialisation des tables G.T.I. et Escouades
db.prepare(`CREATE TABLE IF NOT EXISTS gti (
    userId TEXT PRIMARY KEY,
    operator TEXT DEFAULT 'Recrue',
    level INTEGER DEFAULT 1,
    loot_cache INTEGER DEFAULT 0,
    stamina INTEGER DEFAULT 100,
    base_level INTEGER DEFAULT 1,
    lastDaily TEXT DEFAULT '0'
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS escouades (
    id TEXT PRIMARY KEY,
    chefId TEXT,
    membres TEXT,
    missionActive INTEGER DEFAULT 0
)`).run();

const nix = {
  name: "gti",
  version: "1.2.0",
  description: "G.T.I. : Jeu de tir, extraction, escouades et classement",
  author: "Camille",
  prefix: true,
  category: "Game",
  type: "anyone",
  cooldown: 5,
  guide: "/gti <profile|raid|extract|base|armory|team|daily|top>"
};

async function onStart({ message, args, userId }) {
  const subcmd = args[0]?.toLowerCase();
  db.prepare("INSERT OR IGNORE INTO gti (userId) VALUES (?)").run(String(userId));
  let p = db.prepare("SELECT * FROM gti WHERE userId = ?").get(String(userId));

  switch(subcmd) {
    case 'daily':
      const today = new Date().toISOString().split('T')[0];
      if (p.lastDaily === today) return message.reply("❌ Récompense déjà réclamée aujourd'hui !");
      const bonus = 200;
      db.prepare("UPDATE gti SET loot_cache = loot_cache + ?, lastDaily = ? WHERE userId = ?").run(bonus, today, String(userId));
      message.reply(`🎁 **CADEAU QUOTIDIEN :** Tu as reçu ${bonus} unités de butin pour ton Centre d'opérations.`);
      break;

    case 'team':
      const action = args[1]?.toLowerCase();
      if (action === 'create') {
        const teamId = userId.slice(-4);
        db.prepare("INSERT INTO escouades (id, chefId, membres) VALUES (?, ?, ?)").run(teamId, userId, userId);
        message.reply(`🤝 **ESCOUADE CRÉÉE :** ID ${teamId}. Recrute tes alliés avec ce code.`);
      } else if (action === 'join') {
        const tId = args[2];
        const team = db.prepare("SELECT * FROM escouades WHERE id = ?").get(tId);
        if (!team) return message.reply("❌ Escouade introuvable.");
        db.prepare("UPDATE escouades SET membres = membres || ',' || ? WHERE id = ?").run(userId, tId);
        message.reply("✅ **REJOINT :** Tu fais partie de l'escouade !");
      } else {
        message.reply("🎮 **Escouade G.T.I.**\n/gti team create : Créer une équipe.\n/gti team join [ID] : Rejoindre une équipe.");
      }
      break;

    case 'top':
      const allTeams = db.prepare("SELECT * FROM escouades").all();
      const rankedTeams = allTeams.map(team => {
        const memberIds = team.membres.split(',');
        let totalLevel = 0;
        memberIds.forEach(id => {
          const memberData = db.prepare("SELECT level FROM gti WHERE userId = ?").get(id);
          if (memberData) totalLevel += memberData.level;
        });
        return { id: team.id, totalLevel };
      });
      rankedTeams.sort((a, b) => b.totalLevel - a.totalLevel);
      let msg = "🏆 **CLASSEMENT DES MEILLEURES ESCOUADES G.T.I.** 🏆\n\n";
      if (rankedTeams.length === 0) {
        msg += "Aucune escouade enregistrée pour le moment.";
      } else {
        rankedTeams.slice(0, 5).forEach((team, index) => {
          msg += `${index + 1}. 🤝 **Escouade [${team.id}]** — Niveau Global : ${team.totalLevel} ⭐\n`;
        });
      }
      message.reply(msg);
      break;

    case 'profile':
      message.reply(`🎯 **PROFIL OPÉRATEUR**\n👤 Opérateur : ${p.operator} | Niveau : ${p.level}\n📦 Cache de butin : ${p.loot_cache}\n🏢 Niveau Centre Op. : ${p.base_level}`);
      break;

    case 'raid':
      if (p.stamina < 20) return message.reply("⚡ Énergie insuffisante pour un raid.");
      const success = Math.random() > 0.3;
      if (success) {
        db.prepare("UPDATE gti SET loot_cache = loot_cache + 500, stamina = stamina - 20 WHERE userId = ?").run(String(userId));
        message.reply("💰 **RAID RÉUSSI !** Tu as récupéré du butin. Utilise /gti extract !");
      } else {
        db.prepare("UPDATE gti SET stamina = stamina - 20 WHERE userId = ?").run(String(userId));
        message.reply("💥 **RAID ÉCHOUÉ !** Repli tactique nécessaire.");
      }
      break;

    case 'extract':
      if (p.loot_cache <= 0) return message.reply("❌ Rien à extraire.");
      db.prepare("UPDATE gti SET loot_cache = 0, level = level + 1 WHERE userId = ?").run(String(userId));
      message.reply("🚁 **EXTRACTION RÉUSSIE !** Ton Centre d'opérations est approvisionné. Tu gagnes +1 Niveau !");
      break;

    case 'base':
      if (p.loot_cache < 1000) return message.reply("❌ Butin insuffisant (1000 requis).");
      db.prepare("UPDATE gti SET base_level = base_level + 1, loot_cache = loot_cache - 1000 WHERE userId = ?").run(String(userId));
      message.reply(`🏗️ **BASE AMÉLIORÉE !** Niveau ${p.base_level + 1}.`);
      break;

    case 'armory':
      message.reply("🔫 **ARMURERIE**\nPersonnalise tes armes et véhicules pour dominer terre, mer et air.");
      break;

    default:
      message.reply(`🎮 **G.T.I. - GUERRE TOTALE**\n/gti <profile|raid|extract|base|armory|team|daily|top>`);
  }
}

module.exports = { nix, onStart };
