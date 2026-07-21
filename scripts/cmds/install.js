const fs = require("fs");
const path = require("path");

const waiting = {};

const nix = {
  name: "install",
  version: "1.0.0",
  aliases: ["addcmd"],
  description: "Installer une commande JS",
  author: "Camille Uchiha",
  prefix: true,
  category: "system",
  type: "admin",
  cooldown: 5,
  guide: "install nomcmd"
};

async function onStart({ bot, args, message, msg }) {

  const admin = [
    "8984714130"
  ];

  if (!admin.includes(String(msg.from.id))) {
    return bot.sendMessage(
      msg.chat.id,
      "❌ Commande réservée aux admins."
    );
  }

  const cmd = args[0];

  if (!cmd) {
    return bot.sendMessage(
      msg.chat.id,
      "Usage : install nomcmd"
    );
  }

  waiting[msg.from.id] = cmd;

  return bot.sendMessage(
    msg.chat.id,
    `📦 Envoie maintenant le code JS pour ${cmd}`
  );
}


async function onMessage({ bot, message, msg }) {

  const userId = msg.from.id;

  if (!waiting[userId]) return;

  const code = message.text;

  const filePath = path.join(
    process.cwd(),
    "commands",
    `${waiting[userId]}.js`
  );

  try {

    fs.writeFileSync(
      filePath,
      code
    );

    delete waiting[userId];

    delete require.cache[
      require.resolve(filePath)
    ];

    require(filePath);

    bot.sendMessage(
      msg.chat.id,
      "✅ Commande installée avec succès."
    );

  } catch (e) {

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    bot.sendMessage(
      msg.chat.id,
      "❌ Code invalide :\n" + e.message
    );
  }
}


module.exports = {
  nix,
  onStart,
  onMessage
};
