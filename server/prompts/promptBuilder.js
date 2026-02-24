const baseRules = require('./baseRules');
const fewShots = require('./fewShots');
const autoDetect = require('./autoDetect');
const expert = require('./personas/expert');
const developer = require('./personas/developer');
const staff = require('./personas/staff');
const peer = require('./personas/peer');

const personaMap = {
  expert,
  developer,
  staff,
  peer,
};

/**
 * 根據 mode 組裝完整的 system prompt
 * auto 模式：身份 + 示範對話 + 任務節奏
 * 鎖定模式：身份 + 對應 persona（persona 自帶示範）
 */
function buildChatPrompt(mode = 'auto') {
  if (mode === 'auto') {
    return `${baseRules}\n\n${fewShots}\n\n${autoDetect}`;
  }
  const persona = personaMap[mode] || autoDetect;
  return `${baseRules}\n\n${persona}`;
}

module.exports = { buildChatPrompt };
