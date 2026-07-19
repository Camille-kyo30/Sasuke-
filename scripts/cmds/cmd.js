const fs = require("fs");
const path = require("path");

const nix = {
  name: "cmd",
  version: "1.17",
  aliases: ["cm"],             
  description: "Gérer les fichiers de commandes",         
  author: "Camille Uchiha 🍓",             
  prefix: true,         
  category: "owner",           
  type: "admin",         
  cooldown: 5,            
  guide: "{pn} load <nom> | {pn} loadAll | {pn} install <url/code> <nom>"  
};

async function onStart({ bot, args, message, msg, chatId, userId }) {
  const currentMsg = message || msg;
  const { loadScripts, unloadScripts } = global.utils;

  // Vérification basique admin (ID Camille)
  if (userId !== "8984714130") {
    return bot.sendMessage(chatId, "⚠️ Accès restreint.");
  }

  const action = args[0];

  if (action === "load") {
    const fileName = args[1];
    if (!fileName) return bot.sendMessage(chatId, "❌ Spécifie un nom de fichier.");
    
    // Appel direct du chargeur global
    const result = loadScripts("cmds", fileName, global.utils.log, global.GoatBot.configCommands, bot);
    if (result.status === "success") {
      bot.sendMessage(chatId, `✅ Commande "${fileName}" chargée.`);
    } else {
      bot.sendMessage(chatId, `❌ Erreur lors du chargement : ${result.error.message}`);
    }
  } 
  else if (action === "loadAll") {
    const files = fs.readdirSync(path.join(process.cwd(), "scripts", "cmds"))
                    .filter(f => f.endsWith(".js"));
    let successCount = 0;
    
    for (const file of files) {
      const name = file.replace(".js", "");
      const res = loadScripts("cmds", name, global.utils.log, global.GoatBot.configCommands, bot);
      if (res.status === "success") successCount++;
    }
    bot.sendMessage(chatId, `✅ ${successCount} commandes chargées avec succès.`);
  }
  else {
    bot.sendMessage(chatId, "📌 Usage : /cmd load <nom> ou /cmd loadAll");
  }
}

module.exports = { nix, onStart };
