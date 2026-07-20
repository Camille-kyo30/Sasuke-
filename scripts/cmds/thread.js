const nix = {
  name: "thread",
  version: "1.5",
  aliases: ["group"],
  description: "Manage group chat in bot system",
  author: "Camille Uchiha",
  prefix: true,
  category: "owner",
  type: "admin",
  cooldown: 5,
  guide: "{pn} [find | -f | search | -s] <tên cần tìm>\n{pn} [ban | -b] [<tid> | để trống] <reason>\n{pn} unban [<tid> | để trống]\n{pn} info [<tid> | để trống]"
};

async function onStart({ bot, args, message, msg, usages, threadsData, event }) {
  const { getTime } = global.utils;
  const type = args[0];
  const role = bot?.role || 2; // Assuming admin check based on original structure

  switch (type) {
    case "find":
    case "search":
    case "-f":
    case "-s": {
      if (role < 2)
        return message.reply("Bạn không có quyền sử dụng tính năng này");
      let allThread = await threadsData.getAll();
      let keyword = args.slice(1).join(" ");
      if (['--j', '-join'].includes(args[1])) {
        allThread = allThread.filter(thread => thread.members.some(member => member.userID == global.GoatBot.botID && member.inGroup));
        keyword = args.slice(2).join(" ");
      }
      const result = allThread.filter(item => item.threadID.length > 15 && (item.threadName || "").toLowerCase().includes(keyword.toLowerCase()));
      const resultText = result.reduce((i, thread) => i += `\n╭Name: ${thread.threadName}\n╰ID: ${thread.threadID}`, "");
      let text = "";
      if (result.length > 0)
        text += `🔎 Tìm thấy ${result.length} nhóm trùng với từ khóa "${keyword}" trong dữ liệu của bot:\n${resultText}`;
      else
        text += `✗ Không tìm thấy nhóm nào có tên khớp với từ khoá: "${keyword}" trong dữ liệu của bot`;
      return message.reply(text);
    }
    case "ban":
    case "-b": {
      if (role < 2)
        return message.reply("Bạn không có quyền sử dụng tính năng này");
      let tid, reason;
      if (!isNaN(args[1])) {
        tid = args[1];
        reason = args.slice(2).join(" ");
      }
      else {
        tid = event.threadID;
        reason = args.slice(1).join(" ");
      }
      if (!tid)
        return message.reply(usages);
      if (!reason)
        return message.reply("Lý do cấm không được để trống");
      reason = reason.replace(/\s+/g, ' ');
      const threadData = await threadsData.get(tid);
      const name = threadData.threadName;
      const status = threadData.banned.status;

      if (status)
        return message.reply(`Nhóm mang id [${tid} | ${name}] đã bị cấm từ trước:\n» Lý do: ${threadData.banned.reason}\n» Thời gian: ${threadData.banned.date}`);
      const time = getTime("DD/MM/YYYY HH:mm:ss");
      await threadsData.set(tid, {
        banned: {
          status: true,
          reason,
          date: time
        }
      });
      return message.reply(`Đã cấm nhóm mang id [${tid} | ${name}] sử dụng bot.\n» Lý do: ${reason}\n» Thời gian: ${time}`);
    }
    case "unban":
    case "-u": {
      if (role < 2)
        return message.reply("Bạn không có quyền sử dụng tính năng này");
      let tid;
      if (!isNaN(args[1]))
        tid = args[1];
      else
        tid = event.threadID;
      if (!tid)
        return message.reply(usages);

      const threadData = await threadsData.get(tid);
      const name = threadData.threadName;
      const status = threadData.banned.status;

      if (!status)
        return message.reply(`Hiện tại nhóm mang id [${tid} | ${name}] không bị cấm sử dụng bot`);
      await threadsData.set(tid, {
        banned: {}
      });
      return message.reply(`Đã bỏ cấm nhóm mang tid [${tid} | ${name}] sử dụng bot`);
    }
    case "info":
    case "-i": {
      let tid;
      if (!isNaN(args[1]))
        tid = args[1];
      else
        tid = event.threadID;
      if (!tid)
        return message.reply(usages);
      const threadData = await threadsData.get(tid);
      const createdDate = getTime(threadData.createdAt, "DD/MM/YYYY HH:mm:ss");
      const valuesMember = Object.values(threadData.members).filter(item => item.inGroup);
      const totalBoy = valuesMember.filter(item => item.gender == "MALE").length;
      const totalGirl = valuesMember.filter(item => item.gender == "FEMALE").length;
      const totalMessage = valuesMember.reduce((i, item) => i += item.count, 0);
      const infoBanned = threadData.banned.status ?
        `\n- Banned: ${threadData.banned.status}`
        + `\n- Reason: ${threadData.banned.reason}`
        + `\n- Time: ${threadData.banned.date}` :
        "";
      const infoText = `» Box ID: ${threadData.threadID}\n» Tên: ${threadData.threadName}\n» Ngày tạo data: ${createdDate}\n» Tổng thành viên: ${valuesMember.length}\n» Nam: ${totalBoy} thành viên\n» Nữ: ${totalGirl} thành viên\n» Tổng tin nhắn: ${totalMessage}${infoBanned}`;
      return message.reply(infoText);
    }
    default:
      return message.reply(usages);
  }
}

module.exports = { nix, onStart };
