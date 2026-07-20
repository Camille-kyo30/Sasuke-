const { getStreamsFromAttachment, log } = global.utils;
const mediaTypes = ["photo", 'png', "animated_image", "video", "audio"];

const nix = {
    name: "callad",
    version: "2.0",
    aliases: ["calladmin", "report"],
    description: "Envoie un rapport, une suggestion ou un bug aux administrateurs du bot",
    author: "NTKhang + Mod by ChatGPT",
    editor: "Camille",
    prefix: true,
    category: "Contacts Admin",
    type: "admin",
    cooldown: 5,
    guide: "/callad <votre message>"
};

async function onStart({ args, message, event, usersData, threadsData, api, commandName }) {
    if (!args[0]) return message.reply("⚠ Veuillez entrer un message à envoyer aux administrateurs.");

    // Chargement de la configuration admin (adapté à votre structure config.json)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '..', '..', 'config.json');
    let adminBot = [];
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        adminBot = configData.admin || [];
    } catch (e) {
        adminBot = [];
    }

    if (adminBot.length === 0)
        return message.reply("❗ Le bot n'a aucun administrateur configuré.");

    const { senderID, threadID, isGroup } = event;
    const senderName = await usersData.getName(senderID);
    const threadName = isGroup ? (await threadsData.get(threadID)).threadName : null;

    const formattedMsg = 
`╭━━━ ⌜📨 APPEL UTILISATEUR 📬⌟ ━━━╮

👤 Nom        : ${senderName}
🆔 ID         : ${senderID}
🌐 Contexte   : ${isGroup ? `Groupe "${threadName}" (ID: ${threadID})` : "Message Privé"}

📝 Message reçu :
『 ${args.join(" ")} 』

📎 Pièces jointes : ${event.attachments?.length > 0 ? "✅" : "❌"}

╰━━━ ⫷ Réponds à ce message pour contacter l’utilisateur ⫸ ━━━╯`;

    const attachmentsList = [...(event.attachments || []), ...(event.messageReply?.attachments || [])];
    const formMessage = {
        body: formattedMsg,
        mentions: [{
            id: senderID,
            tag: senderName
        }],
        attachment: typeof getStreamsFromAttachment === 'function' 
            ? await getStreamsFromAttachment(attachmentsList.filter(item => mediaTypes.includes(item.type)))
            : []
    };

    const successIDs = [], failedIDs = [];
    const adminNames = await Promise.all(adminBot.map(async id => ({
        id,
        name: await usersData.getName(id)
    })));

    for (const uid of adminBot) {
        try {
            const msgSent = await api.sendMessage(formMessage, uid);
            successIDs.push(uid);
            if (!global.teamnix) global.teamnix = { onReply: new Map() };
            if (!global.teamnix.onReply) global.teamnix.onReply = new Map();
            
            global.teamnix.onReply.set(msgSent.messageID, {
                commandName,
                messageID: msgSent.messageID,
                threadID,
                messageIDSender: event.messageID,
                type: "userCallAdmin"
            });
        } catch (err) {
            failedIDs.push({ adminID: uid, error: err });
        }
    }

    let msg2 = "";
    if (successIDs.length > 0) {
        msg2 += `✅ Votre message a été envoyé à ${successIDs.length} admin(s) :\n` +
            adminNames.filter(a => successIDs.includes(a.id)).map(a => `• ${a.name}`).join("\n");
    }
    if (failedIDs.length > 0) {
        msg2 += `\n❌ Échec de l'envoi à ${failedIDs.length} admin(s).`;
        if (typeof log?.err === 'function') log.err("CALL ADMIN", failedIDs);
    }

    return message.reply(msg2);
}

module.exports = { nix, onStart };
