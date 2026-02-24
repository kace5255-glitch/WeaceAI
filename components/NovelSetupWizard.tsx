import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Globe, Zap, Crown, Wand2, ChevronDown, User, Swords } from 'lucide-react';
import { NovelSettings } from '../types';
import {
  generateWizardWorldview,
  generateWizardWorldviewOptions,
  generateWizardCharacterOptions,
  generateWizardGoldenFingerOptions,
  generateWizardBrief,
  regenerateWizardBriefField,
  WorldviewCard,
  CardGenerationResult,
  BriefData,
  BriefField
} from '../services/wizardAIService';

interface NovelSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (settings: Partial<NovelSettings>) => void | Promise<void>;
}

// 番茄小說風格分類系統：頻道 → 主類別 → 子類型
interface SubGenreConfig {
  tags: string[];
  levels: string[];
  factions: string[];
  races: string[];
  goldenFingers: string[];
  hasLevels: boolean;
}

interface MainGenreConfig {
  subGenres: Record<string, SubGenreConfig>;
}

const GENRE_SYSTEM: Record<string, Record<string, MainGenreConfig>> = {
  '男頻': {
    '都市': {
      subGenres: {
        '都市異能': {
          tags: ['異能', '覺醒', '都市', '商戰', '兵王', '神醫', '透視', '超能力'],
          levels: ['普通人', 'F級', 'E級', 'D級', 'C級', 'B級', 'A級', 'S級', 'SS級', 'SSS級'],
          factions: ['異能者協會', '政府特殊部門', '地下組織', '古武世家', '國際勢力'],
          races: ['普通人', '異能者', '古武者', '覺醒者', '變異者'],
          goldenFingers: ['系統', '透視', '醫術', '預知', '空間', '時間回溯', '讀心術', '超級大腦'],
          hasLevels: true
        },
        '都市生活': {
          tags: ['現實', '職場', '創業', '家庭', '勵志', '溫馨', '治癒', '成長', '奮鬥', '日常'],
          levels: [],
          factions: ['公司', '家族', '社區', '朋友圈'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '金手指', '特殊技能'],
          hasLevels: false
        },
        '職場商戰': {
          tags: ['職場', '商戰', '創業', '金融', '科技', '互聯網', '投資', '管理', '競爭', '逆襲'],
          levels: [],
          factions: ['公司', '集團', '投資機構', '競爭對手'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '預知', '商業天賦', '金手指'],
          hasLevels: false
        },
        '娛樂明星': {
          tags: ['娛樂圈', '明星', '演員', '歌手', '導演', '編劇', '綜藝', '電影', '音樂', '爆紅'],
          levels: [],
          factions: ['娛樂公司', '經紀公司', '粉絲團', '媒體'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '金手指', '特殊技能', '記憶'],
          hasLevels: false
        }
      }
    },
    // GENRE_SYSTEM_CONTINUE_1
    '玄幻': {
      subGenres: {
        '東方玄幻': {
          tags: ['修煉', '爽文', '打臉', '扮豬吃虎', '單女主', '多女主', '日常', '輕鬆', '熱血', '逆襲'],
          levels: ['凡人', '練氣', '筑基', '金丹', '元嬰', '化神', '煉虛', '合體', '大乘', '渡劫', '仙人'],
          factions: ['正道聯盟', '魔道宗門', '散修聯盟', '世家勢力', '隱世宗門'],
          races: ['人族', '妖族', '魔族', '靈族', '仙族'],
          goldenFingers: ['系統', '老爺爺', '重生', '穿越', '天賦異稟', '神器', '秘籍', '血脈覺醒'],
          hasLevels: true
        },
        '異世大陸': {
          tags: ['異世界', '冒險', '魔法', '鬥氣', '升級', '爽文', '熱血', '輕鬆', '後宮', '王國建設'],
          levels: ['學徒', '初階', '中階', '高階', '大師', '聖域', '半神', '神級'],
          factions: ['魔法公會', '騎士團', '教會', '王國', '帝國', '黑暗勢力'],
          races: ['人類', '精靈', '矮人', '獸人', '龍族', '惡魔', '天使'],
          goldenFingers: ['系統', '穿越', '魔法天賦', '龍血', '神器', '契約', '空間戒指'],
          hasLevels: true
        },
        '高武世界': {
          tags: ['高武', '體修', '武道', '熱血', '爽文', '打臉', '逆襲', '升級', '戰鬥', '強者'],
          levels: ['鍛體', '內勁', '宗師', '大宗師', '先天', '武聖', '武帝', '武神'],
          factions: ['武道世家', '武館', '軍方', '隱世強者', '異族'],
          races: ['人族', '異獸', '妖族'],
          goldenFingers: ['系統', '重生', '天賦', '功法', '血脈', '丹藥'],
          hasLevels: true
        }
      }
    },
    '仙俠': {
      subGenres: {
        '修真文明': {
          tags: ['修真', '宗門', '煉丹', '煉器', '陣法', '天劫', '飛升', '爽文', '種田', '經營'],
          levels: ['凡人', '練氣', '筑基', '金丹', '元嬰', '化神', '煉虛', '合體', '大乘', '渡劫', '仙人'],
          factions: ['正道宗門', '魔道宗門', '散修聯盟', '世家', '仙界勢力'],
          races: ['人族', '妖族', '魔族', '靈族'],
          goldenFingers: ['系統', '老爺爺', '重生', '穿越', '煉丹天賦', '靈根變異', '秘境機緣'],
          hasLevels: true
        },
        '古典仙俠': {
          tags: ['仙俠', '劍修', '俠義', '情緣', '天道', '因果', '輪迴', '飛升', '問道'],
          levels: ['凡人', '練氣', '筑基', '金丹', '元嬰', '化神', '渡劫', '仙人', '金仙', '大羅'],
          factions: ['仙門', '魔道', '妖族', '佛門', '散仙'],
          races: ['人族', '妖族', '魔族', '鬼族', '仙族'],
          goldenFingers: ['仙緣', '神劍', '前世記憶', '天道眷顧', '靈寶', '奇遇'],
          hasLevels: true
        },
        '現代修真': {
          tags: ['都市', '修真', '隱世', '回歸', '低調', '裝逼', '爽文', '輕鬆'],
          levels: ['練氣', '筑基', '金丹', '元嬰', '化神', '渡劫', '仙人'],
          factions: ['隱世宗門', '世俗勢力', '政府部門', '古武世家'],
          races: ['人族', '妖族'],
          goldenFingers: ['重生', '系統', '前世記憶', '仙界歸來', '靈氣復甦'],
          hasLevels: true
        }
      }
    },
    // GENRE_SYSTEM_CONTINUE_2
    '奇幻': {
      subGenres: {
        '西方奇幻': {
          tags: ['魔法', '騎士', '龍', '冒險', '異世界', '中世紀', '精靈', '矮人'],
          levels: ['學徒', '初階', '中階', '高階', '大師', '聖域', '半神', '神級'],
          factions: ['魔法公會', '騎士團', '教會', '王國', '帝國', '黑暗勢力'],
          races: ['人類', '精靈', '矮人', '獸人', '龍族', '惡魔', '天使', '巨人'],
          goldenFingers: ['魔法天賦', '龍血', '神器', '契約', '血脈', '魔寵', '空間戒指'],
          hasLevels: true
        },
        '史詩奇幻': {
          tags: ['史詩', '戰爭', '王座', '預言', '命運', '種族衝突', '遠征', '英雄'],
          levels: ['平民', '戰士', '精英', '領主', '王者', '傳奇', '史詩', '神話'],
          factions: ['王國', '帝國', '部落聯盟', '教廷', '暗影議會', '遠古種族'],
          races: ['人類', '精靈', '矮人', '獸人', '龍族', '亡靈'],
          goldenFingers: ['預言之子', '神器', '血脈覺醒', '遠古傳承', '命運之力'],
          hasLevels: true
        },
        '黑暗奇幻': {
          tags: ['黑暗', '殘酷', '生存', '詛咒', '怪物', '獵人', '末日', '恐怖'],
          levels: ['普通人', '獵人', '精英獵人', '大師', '傳奇', '噩夢級', '災厄級'],
          factions: ['獵人公會', '教會', '貴族', '黑暗教團', '怪物巢穴'],
          races: ['人類', '吸血鬼', '狼人', '亡靈', '惡魔'],
          goldenFingers: ['詛咒之力', '怪物血脈', '暗影契約', '不死之身', '獵人天賦'],
          hasLevels: true
        }
      }
    },
    '武俠': {
      subGenres: {
        '傳統武俠': {
          tags: ['江湖', '門派', '武功', '俠義', '復仇', '尋寶', '爭霸', '恩怨'],
          levels: ['不入流', '三流', '二流', '一流', '絕頂', '宗師', '大宗師', '陸地神仙'],
          factions: ['名門正派', '魔教', '朝廷', '江湖散人', '隱世門派'],
          races: ['人類'],
          goldenFingers: ['武學奇才', '神功秘籍', '靈藥', '神兵', '奇遇', '內力深厚'],
          hasLevels: true
        },
        '新派武俠': {
          tags: ['武俠', '創新', '權謀', '暗殺', '情義', '江湖', '廟堂', '商戰'],
          levels: ['不入流', '三流', '二流', '一流', '絕頂', '宗師', '大宗師'],
          factions: ['朝廷', '江湖門派', '商會', '暗殺組織', '隱世高人'],
          races: ['人類'],
          goldenFingers: ['天賦異稟', '秘籍', '奇遇', '重生', '前世記憶'],
          hasLevels: true
        }
      }
    },
    '歷史': {
      subGenres: {
        '架空歷史': {
          tags: ['架空', '爭霸', '謀略', '種田', '內政', '科技發展', '王朝'],
          levels: ['士兵', '伍長', '隊長', '校尉', '將軍', '大將軍', '元帥', '王侯', '帝王'],
          factions: ['朝廷', '藩鎮', '義軍', '世家', '門閥', '異族'],
          races: ['漢人', '胡人', '蠻族', '夷人'],
          goldenFingers: ['系統', '現代知識', '圖紙', '空間', '預知', '軍事天賦', '科技樹'],
          hasLevels: true
        },
        '歷史穿越': {
          tags: ['穿越', '歷史', '改變歷史', '科技碾壓', '種田', '經商', '爭霸'],
          levels: ['平民', '小吏', '縣令', '太守', '將軍', '丞相', '王侯', '帝王'],
          factions: ['朝廷', '世家', '商會', '軍隊', '異族'],
          races: ['人類'],
          goldenFingers: ['現代知識', '系統', '空間', '圖紙', '預知未來'],
          hasLevels: true
        },
        '軍事戰爭': {
          tags: ['戰爭', '軍事', '謀略', '熱血', '鐵血', '戰場', '將帥', '兵法'],
          levels: ['士兵', '伍長', '百夫長', '校尉', '將軍', '大將軍', '元帥'],
          factions: ['帝國', '王國', '部落', '僱傭兵團', '叛軍'],
          races: ['人類'],
          goldenFingers: ['軍事天賦', '系統', '重生', '預知', '特種兵技能'],
          hasLevels: true
        }
      }
    },
    // GENRE_SYSTEM_CONTINUE_3
    '科幻': {
      subGenres: {
        '星際文明': {
          tags: ['星際', '機甲', '太空歌劇', '外星文明', '艦隊', '殖民', '探索'],
          levels: ['1級', '2級', '3級', '4級', '5級', '6級', '7級', '8級', '9級', '10級'],
          factions: ['星際聯邦', '帝國軍團', '反抗軍', '商業聯盟', '科技公會', '海盜聯盟'],
          races: ['人類', '機械族', '蟲族', '能量體', '矽基生命', '外星種族'],
          goldenFingers: ['AI助手', '科技系統', '基因優化', '機甲', '星艦', '蟲洞技術'],
          hasLevels: true
        },
        '末世危機': {
          tags: ['末世', '喪屍', '進化', '生存', '廢土', '變異', '重建', '求生'],
          levels: ['普通人', '一階', '二階', '三階', '四階', '五階', '六階', '七階'],
          factions: ['倖存者基地', '軍方', '變異者聯盟', '掠奪者', '科研機構'],
          races: ['人類', '變異者', '喪屍', '異獸'],
          goldenFingers: ['系統', '進化', '空間', '重生', '異能覺醒', '基因強化'],
          hasLevels: true
        },
        '賽博朋克': {
          tags: ['賽博朋克', 'AI', '虛擬現實', '義體改造', '黑客', '科技', '反烏托邦'],
          levels: [],
          factions: ['超級企業', '地下組織', '黑客聯盟', '政府', 'AI集群'],
          races: ['人類', '改造人', 'AI', '克隆人'],
          goldenFingers: ['超級AI', '黑客天賦', '義體改造', '虛擬空間', '系統'],
          hasLevels: false
        }
      }
    },
    '遊戲': {
      subGenres: {
        '虛擬網遊': {
          tags: ['網遊', '虛擬現實', '全息', '副本', '公會', 'PK', '裝備', '升級'],
          levels: ['新手', '初級', '中級', '高級', '精英', '大師', '宗師', '傳說', '神話'],
          factions: ['公會', '戰隊', '聯盟', '獨行者', 'NPC勢力'],
          races: ['人類', '精靈', '獸人', '矮人', '龍族', '惡魔', '天使'],
          goldenFingers: ['隱藏職業', 'BUG技能', '神級天賦', '時間回溯', '雙倍經驗', '隱藏任務'],
          hasLevels: true
        },
        '電競': {
          tags: ['電競', '比賽', '戰隊', '職業選手', '熱血', '團隊', '冠軍', '逆襲'],
          levels: [],
          factions: ['戰隊', '俱樂部', '聯盟', '贊助商'],
          races: ['普通人'],
          goldenFingers: ['天賦', '系統', '重生', '超強反應', '戰術天才'],
          hasLevels: false
        },
        '異界遊戲化': {
          tags: ['遊戲化', '異世界', '升級', '技能', '任務', '副本', '怪物'],
          levels: ['1級', '10級', '20級', '30級', '50級', '70級', '100級', '滿級'],
          factions: ['冒險者公會', '王國', '魔王軍', '商會', '隱藏勢力'],
          races: ['人類', '精靈', '獸人', '魔族', '龍族'],
          goldenFingers: ['系統', '隱藏職業', '無限升級', '技能竊取', '怪物收服'],
          hasLevels: true
        }
      }
    },
    '懸疑': {
      subGenres: {
        '偵探推理': {
          tags: ['偵探', '推理', '破案', '燒腦', '邏輯', '密室', '連環案'],
          levels: [],
          factions: ['警方', '偵探社', '犯罪組織', '特殊部門'],
          races: ['普通人'],
          goldenFingers: ['超強推理', '讀心術', '預知', '系統', '特殊能力'],
          hasLevels: false
        },
        '靈異懸疑': {
          tags: ['靈異', '鬼怪', '驅魔', '風水', '詭異', '恐怖', '都市傳說'],
          levels: [],
          factions: ['驅魔師', '道門', '靈異組織', '政府秘密部門'],
          races: ['人類', '鬼魂', '妖怪'],
          goldenFingers: ['陰陽眼', '驅魔天賦', '系統', '前世記憶', '靈異體質'],
          hasLevels: false
        },
        '驚悚': {
          tags: ['驚悚', '恐怖', '生存', '密室逃脫', '無限流', '副本', '求生'],
          levels: [],
          factions: ['倖存者', '神秘組織', '怪物', '規則制定者'],
          races: ['人類'],
          goldenFingers: ['系統', '特殊能力', '預知', '不死', '規則破解'],
          hasLevels: false
        }
      }
    },
    '輕小說': {
      subGenres: {
        '校園日常': {
          tags: ['校園', '日常', '搞笑', '戀愛', '社團', '青春', '輕鬆', '治癒'],
          levels: [],
          factions: ['學生會', '社團', '班級'],
          races: ['普通人'],
          goldenFingers: ['系統', '重生', '特殊能力', '天賦'],
          hasLevels: false
        },
        '異世界': {
          tags: ['異世界', '穿越', '冒險', '後宮', '開掛', '輕鬆', '搞笑', '日常'],
          levels: ['學徒', '初階', '中階', '高階', '大師', '聖域', '神級'],
          factions: ['冒險者公會', '王國', '魔王軍', '教會'],
          races: ['人類', '精靈', '獸人', '魔族', '龍族'],
          goldenFingers: ['穿越', '系統', '無限技能', '鑑定', '收納空間', '不死'],
          hasLevels: true
        },
        '搞笑吐槽': {
          tags: ['搞笑', '吐槽', '日常', '無厘頭', '輕鬆', '歡樂', '腦洞'],
          levels: [],
          factions: [],
          races: ['普通人'],
          goldenFingers: ['系統', '吐槽技能', '搞笑天賦'],
          hasLevels: false
        }
      }
    }
  },
  // GENRE_SYSTEM_FEMALE
  '女頻': {
    '現代言情': {
      subGenres: {
        '豪門總裁': {
          tags: ['豪門', '總裁', '契約', '甜寵', '虐戀', '復仇', '商戰', '豪門恩怨'],
          levels: [],
          factions: ['豪門世家', '商業集團', '娛樂公司', '對手家族'],
          races: ['普通人'],
          goldenFingers: ['重生', '穿越', '系統', '空間', '金手指'],
          hasLevels: false
        },
        '都市甜寵': {
          tags: ['甜寵', '日常', '戀愛', '溫馨', '治癒', '雙向奔赴', '暗戀', '同居'],
          levels: [],
          factions: ['公司', '朋友圈', '家族'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '讀心', '預知'],
          hasLevels: false
        },
        '職場戀愛': {
          tags: ['職場', '戀愛', '辦公室', '上司下屬', '競爭', '成長', '獨立女性'],
          levels: [],
          factions: ['公司', '競爭對手', '合作夥伴'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '商業天賦', '金手指'],
          hasLevels: false
        }
      }
    },
    '古代言情': {
      subGenres: {
        '宮廷權謀': {
          tags: ['宮鬥', '權謀', '後宮', '皇后', '妃嬪', '爭寵', '復仇', '逆襲'],
          levels: [],
          factions: ['皇室', '後宮', '世家', '朝廷'],
          races: ['人類'],
          goldenFingers: ['重生', '穿越', '前世記憶', '醫術', '毒術'],
          hasLevels: false
        },
        '穿越重生': {
          tags: ['穿越', '重生', '逆襲', '復仇', '甜寵', '種田', '經商', '改命'],
          levels: [],
          factions: ['皇室', '世家', '商會', '江湖'],
          races: ['人類'],
          goldenFingers: ['穿越', '重生', '空間', '系統', '現代知識', '醫術'],
          hasLevels: false
        },
        '種田經商': {
          tags: ['種田', '經商', '日常', '美食', '致富', '溫馨', '家長里短', '鄉村'],
          levels: [],
          factions: ['村莊', '商會', '官府', '世家'],
          races: ['人類'],
          goldenFingers: ['空間', '系統', '現代知識', '種植天賦', '廚藝'],
          hasLevels: false
        }
      }
    },
    '幻想言情': {
      subGenres: {
        '仙俠情緣': {
          tags: ['仙俠', '情緣', '修仙', '師徒', '虐戀', '甜寵', '雙修', '飛升'],
          levels: ['凡人', '練氣', '筑基', '金丹', '元嬰', '化神', '渡劫', '仙人'],
          factions: ['仙門', '魔道', '妖族', '天界'],
          races: ['人族', '妖族', '仙族', '魔族'],
          goldenFingers: ['靈根', '前世記憶', '神器', '血脈', '仙緣'],
          hasLevels: true
        },
        '異世戀愛': {
          tags: ['異世界', '穿越', '戀愛', '魔法', '王子', '騎士', '甜寵', '冒險'],
          levels: ['學徒', '初階', '中階', '高階', '大師', '聖域'],
          factions: ['王國', '帝國', '魔法學院', '教會'],
          races: ['人類', '精靈', '獸人', '龍族'],
          goldenFingers: ['穿越', '系統', '魔法天賦', '契約', '治癒之力'],
          hasLevels: true
        },
        '靈異奇緣': {
          tags: ['靈異', '鬼怪', '戀愛', '陰陽', '驅魔', '奇緣', '前世今生'],
          levels: [],
          factions: ['驅魔世家', '鬼界', '天庭', '陰司'],
          races: ['人類', '鬼魂', '妖怪', '神靈'],
          goldenFingers: ['陰陽眼', '前世記憶', '靈異體質', '驅魔天賦'],
          hasLevels: false
        }
      }
    },
    '青春校園': {
      subGenres: {
        '校園戀愛': {
          tags: ['校園', '戀愛', '青春', '暗戀', '初戀', '甜寵', '雙向奔赴', '學長學妹'],
          levels: [],
          factions: ['學生會', '社團', '班級'],
          races: ['普通人'],
          goldenFingers: ['重生', '系統', '讀心', '預知'],
          hasLevels: false
        },
        '青春成長': {
          tags: ['成長', '友情', '夢想', '勵志', '青春', '畢業', '選擇', '蛻變'],
          levels: [],
          factions: ['學校', '家庭', '社團', '朋友圈'],
          races: ['普通人'],
          goldenFingers: ['重生', '天賦', '系統'],
          hasLevels: false
        },
        '競賽勵志': {
          tags: ['競賽', '學霸', '勵志', '逆襲', '天才', '努力', '高考', '奧賽'],
          levels: [],
          factions: ['學校', '競賽隊', '培訓機構'],
          races: ['普通人'],
          goldenFingers: ['學霸系統', '重生', '超強記憶', '天賦'],
          hasLevels: false
        }
      }
    },
    '懸疑推理': {
      subGenres: {
        '刑偵推理': {
          tags: ['刑偵', '推理', '破案', '法醫', '犯罪', '正義', '燒腦'],
          levels: [],
          factions: ['警方', '法醫中心', '犯罪組織', '特殊部門'],
          races: ['普通人'],
          goldenFingers: ['超強推理', '讀心術', '預知', '系統'],
          hasLevels: false
        },
        '心理懸疑': {
          tags: ['心理', '懸疑', '人性', '暗黑', '反轉', '燒腦', '犯罪心理'],
          levels: [],
          factions: ['心理諮詢機構', '警方', '犯罪組織'],
          races: ['普通人'],
          goldenFingers: ['心理分析', '讀心', '系統', '預知'],
          hasLevels: false
        },
        '法醫鑑證': {
          tags: ['法醫', '鑑證', '屍檢', '破案', '科學', '推理', '正義'],
          levels: [],
          factions: ['法醫中心', '警方', '檢察院', '犯罪組織'],
          races: ['普通人'],
          goldenFingers: ['天才法醫', '系統', '特殊感知', '重生'],
          hasLevels: false
        }
      }
    }
  }
};

export const NovelSetupWizard: React.FC<NovelSetupWizardProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [worldviewOptions, setWorldviewOptions] = useState<WorldviewCard[]>([]);
  const [selectedWorldviewCard, setSelectedWorldviewCard] = useState<WorldviewCard | null>(null);
  const [characterOptions, setCharacterOptions] = useState<WorldviewCard[]>([]);
  const [selectedCharacterCard, setSelectedCharacterCard] = useState<WorldviewCard | null>(null);
  const [goldenFingerOptions, setGoldenFingerOptions] = useState<WorldviewCard[]>([]);
  const [selectedGoldenFingerCard, setSelectedGoldenFingerCard] = useState<WorldviewCard | null>(null);
  const [characterHint, setCharacterHint] = useState('');
  const [goldenFingerHint, setGoldenFingerHint] = useState('');
  const [worldviewHint, setWorldviewHint] = useState('');
  const [briefData, setBriefData] = useState<BriefData | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [fieldLoading, setFieldLoading] = useState<BriefField | null>(null);
  const [worldviewIntro, setWorldviewIntro] = useState('');
  const [characterIntro, setCharacterIntro] = useState('');
  const [goldenFingerIntro, setGoldenFingerIntro] = useState('');
  const [customCharacter, setCustomCharacter] = useState('');
  const [customGoldenFinger, setCustomGoldenFinger] = useState('');
  const [settings, setSettings] = useState({
    title: '',
    channel: '',        // '男頻' | '女頻'
    mainGenre: '',      // '玄幻' | '都市' | ...
    subGenre: '',       // '東方玄幻' | '異世大陸' | ...
    genres: [] as string[], // 向後兼容：[mainGenre, subGenre]
    customGenre: '',
    tags: [] as string[],
    customTags: '',
    worldview: '',
    characterDesc: '',
    goldenFinger: ''
  });

  if (!isOpen) return null;

  // 獲取當前選中子類型的配置
  const getSubGenreConfig = (): SubGenreConfig | null => {
    if (!settings.channel || !settings.mainGenre || !settings.subGenre) return null;
    const channelData = GENRE_SYSTEM[settings.channel];
    if (!channelData) return null;
    const mainGenreData = channelData[settings.mainGenre];
    if (!mainGenreData) return null;
    return mainGenreData.subGenres[settings.subGenre] || null;
  };

  // 獲取標籤
  const getMergedTags = () => {
    const config = getSubGenreConfig();
    return config ? config.tags : [];
  };

  const detectLanguage = (): string => {
    const userInput = settings.worldview || settings.customGenre || settings.customTags;
    if (userInput) {
      if (/[\u4e00-\u9fff]/.test(userInput)) {
        if (/[繁體傳統說話這個來時]/.test(userInput)) return '繁體中文';
        return '簡體中文';
      }
      if (/[\u0e00-\u0e7f]/.test(userInput)) return 'ภาษาไทย';
      if (/[\u0600-\u06ff]/.test(userInput)) return 'Bahasa Indonesia';
      if (/[\u0080-\u024f]/.test(userInput)) return 'English';
    }
    const lang = navigator.language;
    if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK')) return '繁體中文';
    if (lang.startsWith('zh')) return '簡體中文';
    if (lang.startsWith('th')) return 'ภาษาไทย';
    if (lang.startsWith('vi')) return 'Tiếng Việt';
    if (lang.startsWith('id')) return 'Bahasa Indonesia';
    if (lang.startsWith('en')) return 'English';
    return '繁體中文';
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    try {
      const brief = briefData;
      // 從書名建議取第一個作為預設書名
      const firstTitle = brief?.titles?.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
      const novelTitle = settings.title || firstTitle || '未命名小說';
      const briefText = brief ? [
        `📖 書名建議：\n${brief.titles}`,
        `🏷️ 類型定位：${brief.genre_position}`,
        `🌍 世界觀設定：\n${brief.worldview_full}`,
        `👤 主角設定：\n${brief.character_full}`,
        `⚡ 金手指/外掛設定：\n${brief.goldenfinger_full}`,
        `🔥 核心賣點：\n${brief.selling_points}`,
        `📋 開局構想：\n${brief.opening}`
      ].join('\n\n') : '';
      const completeSettings = {
        title: novelTitle,
        genre: settings.subGenre ? `${settings.mainGenre} - ${settings.subGenre}` : (settings.customGenre || '未分類'),
        worldview: brief?.worldview_full || settings.worldview,
        background: briefText || `金手指：${settings.goldenFinger}\n主角人設：${settings.characterDesc}\n標籤：${settings.tags.join('、')}`
      };
      console.log('[Wizard] handleComplete settings:', completeSettings);
      await onComplete(completeSettings);
    } catch (error: any) {
      console.error('[Wizard] handleComplete error:', error);
      alert(`創建失敗：${error.message}`);
    }
  };

  const selectChannel = (channel: string) => {
    setSettings(prev => ({
      ...prev,
      channel,
      mainGenre: '',
      subGenre: '',
      genres: [],
      tags: []
    }));
  };

  const selectMainGenre = (mainGenre: string) => {
    setSettings(prev => ({
      ...prev,
      mainGenre,
      subGenre: '',
      genres: [],
      tags: []
    }));
  };

  const selectSubGenre = (subGenre: string) => {
    setSettings(prev => ({
      ...prev,
      subGenre,
      genres: [settings.mainGenre, subGenre]
    }));
  };

  const toggleTag = (tag: string) => {
    setSettings(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // 獲取世界觀範例
  const getWorldviewExamples = () => {
    const examples: { [key: string]: { title: string; content: string }[] } = {
      '玄幻': [
        {
          title: '靈氣復甦型',
          content: '這是一個靈氣復甦的世界，千年前靈氣枯竭，修煉斷絕。如今靈氣回歸，古老的修煉體系重現人間，隱藏的宗門重新開啟山門，修煉者再次出現在世人眼前。世界分為凡界、靈界、仙界三大層次，修煉者通過突破境界可以飛升更高層次的世界。'
        },
        {
          title: '多元宇宙型',
          content: '世界分為凡界、靈界、仙界三大層次。修煉者通過突破境界可以飛升更高層次的世界，每個世界都有獨特的天道法則。凡界靈氣稀薄，修煉艱難；靈界靈氣充沛，強者如雲；仙界則是修煉者的終極目標，傳說中仙人長生不老，掌控天地法則。'
        }
      ],
      '都市': [
        {
          title: '覺醒者世界',
          content: '21世紀初，全球突然出現異能覺醒現象。政府成立特殊部門管理覺醒者，地下組織暗中活動，普通人與覺醒者之間的矛盾日益加深。異能分為元素系、強化系、精神系、特殊系等多個類別，每個覺醒者的能力都獨一無二。'
        }
      ],
      '科幻': [
        {
          title: '星際文明',
          content: '公元3025年，人類已經殖民銀河系數百個星球。星際聯邦統治大部分人類領地，但邊緣星域仍有海盜和反抗軍活動。人類與多個外星種族建立了複雜的外交關係，科技發展日新月異。'
        },
        {
          title: '末日廢土',
          content: '核戰後的地球，文明崩潰，倖存者在廢墟中掙扎求生。輻射變異產生了各種怪物，科技文明的遺跡散落各處。倖存者聚集成不同的勢力，為了資源、領地和生存而戰。'
        }
      ],
      '古代言情': [
        {
          title: '宮廷權謀',
          content: '架空古代王朝，後宮佳麗三千，皇權爭奪激烈。女主角因緣際會進入宮廷，憑藉智慧在宮鬥中生存。朝堂之上權臣當道，後宮之中妃嬪爭寵，一場場權謀大戲輪番上演。'
        }
      ],
      '懸疑': [
        {
          title: '都市懸案',
          content: '現代都市中接連發生離奇案件，看似毫無關聯的案件背後隱藏著驚天陰謀。天才偵探與警方合作，抽絲剝繭，逐步揭開真相。'
        }
      ]
    };

    if (!settings.mainGenre) return [];
    return examples[settings.mainGenre] || [];
  };

  const handleAIGenerate = async (type: string) => {
    setIsGenerating(true);
    const language = detectLanguage();
    try {
      if (type === 'worldview') {
        const worldview = await generateWizardWorldview(
          settings.genres,
          settings.tags,
          settings.worldview,
          language
        );
        setSettings(prev => ({ ...prev, worldview }));
      }
    } catch (error: any) {
      alert(`生成失敗：${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIGenerateOptions = async (type: 'worldview') => {
    setIsGenerating(true);
    // Clear old options so UI shows loading state
    if (type === 'worldview') setWorldviewOptions([]);
    const language = detectLanguage();
    try {
      if (type === 'worldview') {
        const result = await generateWizardWorldviewOptions(settings.genres, settings.tags, worldviewHint, language);
        setWorldviewIntro(result.intro);
        setWorldviewOptions(result.cards);
      }
    } catch (error: any) {
      alert(`生成失敗：${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 選中世界觀方向卡片
  const handleSelectWorldviewCard = (card: WorldviewCard) => {
    setSelectedWorldviewCard(card);
    setSettings(prev => ({ ...prev, worldview: `${card.title}\n${card.desc}` }));
  };

  const handleAIGenerateCards = async (type: 'character' | 'goldenfinger') => {
    setIsGenerating(true);
    if (type === 'character') setCharacterOptions([]);
    else setGoldenFingerOptions([]);
    const language = detectLanguage();
    try {
      if (type === 'character') {
        const result = await generateWizardCharacterOptions(settings.genres, settings.tags, settings.worldview, characterHint, language);
        setCharacterIntro(result.intro);
        setCharacterOptions(result.cards);
      } else {
        const result = await generateWizardGoldenFingerOptions(settings.genres, settings.tags, settings.worldview, settings.characterDesc, goldenFingerHint, language);
        setGoldenFingerIntro(result.intro);
        setGoldenFingerOptions(result.cards);
      }
    } catch (error: any) {
      alert(`生成失敗：${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectCharacterCard = (card: WorldviewCard) => {
    setSelectedCharacterCard(card);
    setSettings(prev => ({ ...prev, characterDesc: `${card.title}\n${card.desc}` }));
  };

  const handleSelectGoldenFingerCard = (card: WorldviewCard) => {
    setSelectedGoldenFingerCard(card);
    setSettings(prev => ({ ...prev, goldenFinger: `${card.title}\n${card.desc}` }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">靈感火花嚮導</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">STEP {step} / 5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: 選擇賽道（類型 + 標籤） */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Globe size={48} className="mx-auto mb-4 text-violet-500" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">選擇賽道</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">選擇頻道、主類別、子類型和標籤</p>
              </div>

              {/* ① 選擇頻道 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">頻道</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(GENRE_SYSTEM).map(channel => (
                    <button
                      key={channel}
                      onClick={() => selectChannel(channel)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all ${
                        settings.channel === channel
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>

              {/* ② 選擇主類別 */}
              {settings.channel && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主類別</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.keys(GENRE_SYSTEM[settings.channel]).map(mainGenre => (
                      <button
                        key={mainGenre}
                        onClick={() => selectMainGenre(mainGenre)}
                        className={`px-4 py-3 rounded-xl font-medium transition-all ${
                          settings.mainGenre === mainGenre
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {mainGenre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ③ 選擇子類型 */}
              {settings.channel && settings.mainGenre && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">子類型</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.keys(GENRE_SYSTEM[settings.channel][settings.mainGenre].subGenres).map(subGenre => (
                      <button
                        key={subGenre}
                        onClick={() => selectSubGenre(subGenre)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all relative ${
                          settings.subGenre === subGenre
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {subGenre}
                        {settings.subGenre === subGenre && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 自定義類型 */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  或自定義類型
                </label>
                <input
                  type="text"
                  value={settings.customGenre}
                  onChange={(e) => setSettings(prev => ({ ...prev, customGenre: e.target.value }))}
                  placeholder="例如：靈異懸疑、二次元同人"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              {/* 已選擇提示 */}
              {settings.subGenre && (
                <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    已選擇：{settings.channel} &gt; {settings.mainGenre} &gt; {settings.subGenre}
                  </p>
                </div>
              )}

              {/* 分隔線 */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>

              {/* 選擇標籤 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">選擇標籤</label>
                {settings.subGenre || settings.customGenre ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {getMergedTags().map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            settings.tags.includes(tag)
                              ? 'bg-violet-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* 手動輸入標籤 */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        手動輸入自定義標籤
                      </label>
                      <textarea
                        value={settings.customTags}
                        onChange={(e) => setSettings(prev => ({ ...prev, customTags: e.target.value }))}
                        placeholder="用逗號或換行分隔，例如：&#10;年代重生&#10;單女主&#10;爽文"
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">請先選擇類型</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: 世界觀設定 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Globe size={48} className="mx-auto mb-4 text-violet-500" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">世界觀設定</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">描述你的故事世界背景</p>
              </div>

              {/* 參考範例 */}
              {settings.mainGenre && getWorldviewExamples().length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      💡 參考範例（點擊{showExamples ? '收起' : '展開'}）
                    </p>
                    <ChevronDown
                      size={18}
                      className={`text-blue-700 dark:text-blue-300 transition-transform ${showExamples ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showExamples && (
                    <div className="mt-3 space-y-2">
                      {getWorldviewExamples().map((example, i) => (
                        <div key={i} className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <p className="font-medium text-sm text-blue-800 dark:text-blue-200 mb-1">{example.title}</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{example.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 用戶想法輸入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  你的想法（選填）
                </label>
                <input
                  type="text"
                  value={worldviewHint}
                  onChange={(e) => setWorldviewHint(e.target.value)}
                  placeholder="例如：我想要一個黑暗壓抑的末世風格..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              {/* AI 生成選項按鈕 */}
              {worldviewOptions.length === 0 && !isGenerating && (
                <button
                  onClick={() => handleAIGenerateOptions('worldview')}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all"
                >
                  <Wand2 size={18} />開始抽卡（9 個世界觀方向）
                </button>
              )}

              {/* 生成中 loading */}
              {worldviewOptions.length === 0 && isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">正在生成世界觀方向...</p>
                </div>
              )}

              {/* 3×3 方向卡片 */}
              {worldviewOptions.length > 0 && (
                <div className="space-y-3">
                  {/* 敘事引導語 */}
                  {worldviewIntro && (
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                      <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed italic">{worldviewIntro}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">選擇一個方向，AI 將生成完整世界觀</p>
                    <button
                      onClick={() => { setSelectedWorldviewCard(null); handleAIGenerateOptions('worldview'); }}
                      disabled={isGenerating}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Wand2 size={12} />換一批
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {worldviewOptions.map((card, i) => (
                      <div
                        key={i}
                        onClick={() => !isGenerating && handleSelectWorldviewCard(card)}
                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                          selectedWorldviewCard?.title === card.title
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-500'
                        } ${isGenerating ? 'opacity-60 cursor-wait' : ''}`}
                      >
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1 leading-tight">{card.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{card.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 世界觀 textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  世界觀描述{selectedWorldviewCard ? '（已選擇方向，可手動補充）' : worldviewOptions.length > 0 ? '（選擇方向卡片或手動編輯）' : ''}
                </label>
                <textarea
                  value={settings.worldview}
                  onChange={(e) => setSettings(prev => ({ ...prev, worldview: e.target.value }))}
                  placeholder="例如：這是一個修仙世界，靈氣復甦，人人可修煉..."
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: 主角人設 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User size={48} className="mx-auto mb-4 text-violet-500" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">主角人設</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">選擇主角的身份方向</p>
              </div>

              {/* 用戶想法輸入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">你的想法（選填）</label>
                <input type="text" value={characterHint} onChange={(e) => setCharacterHint(e.target.value)}
                  placeholder="例如：我想要一個廢材逆襲的主角..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              {/* 開始抽卡按鈕 */}
              {characterOptions.length === 0 && !isGenerating && (
                <button onClick={() => handleAIGenerateCards('character')} disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all">
                  <Wand2 size={18} />開始抽卡（9 個人設方向）
                </button>
              )}

              {characterOptions.length === 0 && isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">正在生成人設方向...</p>
                </div>
              )}

              {characterOptions.length > 0 && (
                <div className="space-y-3">
                  {/* 敘事引導語 */}
                  {characterIntro && (
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                      <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed italic">{characterIntro}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">選擇一個主角身份方向</p>
                    <button onClick={() => { setSelectedCharacterCard(null); handleAIGenerateCards('character'); }} disabled={isGenerating}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Wand2 size={12} />換一批
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {characterOptions.map((card, i) => (
                      <div key={i} onClick={() => !isGenerating && handleSelectCharacterCard(card)}
                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                          selectedCharacterCard?.title === card.title
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-500'
                        } ${isGenerating ? 'opacity-60 cursor-wait' : ''}`}>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1 leading-tight">{card.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{card.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 自定義答案 */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={customCharacter}
                      onChange={(e) => setCustomCharacter(e.target.value)}
                      placeholder="自定義答案（例如：幕後大魔王·馬甲流）"
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (customCharacter.trim()) {
                          setSelectedCharacterCard(null);
                          setSettings(prev => ({ ...prev, characterDesc: customCharacter.trim() }));
                        }
                      }}
                      disabled={!customCharacter.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      提交
                    </button>
                  </div>
                </div>
              )}

              {/* 人設 textarea */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  主角身份描述{selectedCharacterCard ? '（已選擇方向，可手動補充）' : characterOptions.length > 0 ? '（選擇方向卡片或手動編輯）' : ''}
                </label>
                <textarea value={settings.characterDesc} onChange={(e) => setSettings(prev => ({ ...prev, characterDesc: e.target.value }))}
                  placeholder="例如：被家族拋棄的天才少年，身懷神秘血脈..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 4: 外掛/金手指 */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Swords size={48} className="mx-auto mb-4 text-violet-500" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">外掛/金手指</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">選擇主角的核心優勢</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">你的想法（選填）</label>
                <input type="text" value={goldenFingerHint} onChange={(e) => setGoldenFingerHint(e.target.value)}
                  placeholder="例如：我想要一個簽到系統..."
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              {goldenFingerOptions.length === 0 && !isGenerating && (
                <button onClick={() => handleAIGenerateCards('goldenfinger')} disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all">
                  <Wand2 size={18} />開始抽卡（9 個外掛方向）
                </button>
              )}

              {goldenFingerOptions.length === 0 && isGenerating && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">正在生成外掛方向...</p>
                </div>
              )}

              {goldenFingerOptions.length > 0 && (
                <div className="space-y-3">
                  {/* 敘事引導語 */}
                  {goldenFingerIntro && (
                    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
                      <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed italic">{goldenFingerIntro}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">選擇一個外掛方向</p>
                    <button onClick={() => { setSelectedGoldenFingerCard(null); handleAIGenerateCards('goldenfinger'); }} disabled={isGenerating}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Wand2 size={12} />換一批
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {goldenFingerOptions.map((card, i) => (
                      <div key={i} onClick={() => !isGenerating && handleSelectGoldenFingerCard(card)}
                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                          selectedGoldenFingerCard?.title === card.title
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:border-violet-300 dark:hover:border-violet-500'
                        } ${isGenerating ? 'opacity-60 cursor-wait' : ''}`}>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 mb-1 leading-tight">{card.title}</p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{card.desc}</p>
                        <div className="flex flex-wrap gap-1">
                          {card.tags.map((tag, j) => (
                            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 自定義答案 */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={customGoldenFinger}
                      onChange={(e) => setCustomGoldenFinger(e.target.value)}
                      placeholder="自定義答案（例如：簽到系統·每日獎勵流）"
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (customGoldenFinger.trim()) {
                          setSelectedGoldenFingerCard(null);
                          setSettings(prev => ({ ...prev, goldenFinger: customGoldenFinger.trim() }));
                        }
                      }}
                      disabled={!customGoldenFinger.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      提交
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  外掛描述{selectedGoldenFingerCard ? '（已選擇方向，可手動補充）' : goldenFingerOptions.length > 0 ? '（選擇方向卡片或手動編輯）' : ''}
                </label>
                <textarea value={settings.goldenFinger} onChange={(e) => setSettings(prev => ({ ...prev, goldenFinger: e.target.value }))}
                  placeholder="例如：簽到系統，每天簽到獲得隨機獎勵..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 5: 確認立項書 */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <BookOpen size={48} className="mx-auto mb-4 text-violet-500" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">確認立項書</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">確認前面步驟的設定，再生成完整立項書</p>
              </div>

              {/* Step 1-4 摘要（可編輯） */}
              <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">已選設定</p>

                {/* Step 1: 賽道 / 類型 */}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">🏷️ 賽道與類型</label>
                  <div className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-600">
                    {settings.channel && <span className="inline-block bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded text-xs font-medium mr-2">{settings.channel}</span>}
                    {settings.mainGenre && <span className="inline-block bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-medium mr-2">{settings.mainGenre}</span>}
                    {settings.subGenre && <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-medium mr-2">{settings.subGenre}</span>}
                    {settings.tags.length > 0 && settings.tags.map(tag => (
                      <span key={tag} className="inline-block bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs mr-1 mb-1">{tag}</span>
                    ))}
                    {!settings.channel && !settings.mainGenre && <span className="text-gray-400 text-xs">尚未選擇</span>}
                  </div>
                </div>

                {/* Step 2: 世界觀 */}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">🌍 世界觀設定</label>
                  <textarea
                    value={settings.worldview}
                    onChange={(e) => setSettings(prev => ({ ...prev, worldview: e.target.value }))}
                    placeholder="世界觀設定..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-y leading-relaxed"
                  />
                </div>

                {/* Step 3: 主角人設 */}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">👤 主角人設</label>
                  <textarea
                    value={settings.characterDesc}
                    onChange={(e) => setSettings(prev => ({ ...prev, characterDesc: e.target.value }))}
                    placeholder="主角人設描述..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-y leading-relaxed"
                  />
                </div>

                {/* Step 4: 金手指 */}
                <div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-200">⚡ 金手指/外掛</label>
                  <textarea
                    value={settings.goldenFinger}
                    onChange={(e) => setSettings(prev => ({ ...prev, goldenFinger: e.target.value }))}
                    placeholder="金手指/外掛設定..."
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* 生成立項書按鈕 */}
              {!briefData && !briefLoading && (
                <button
                  onClick={async () => {
                    setBriefLoading(true);
                    try {
                      const language = detectLanguage();
                      const data = await generateWizardBrief(settings.genres, settings.tags, settings.worldview, settings.characterDesc, settings.goldenFinger, language);
                      setBriefData(data);
                    } catch (error: any) {
                      alert(`生成失敗：${error.message}`);
                    } finally {
                      setBriefLoading(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all"
                >
                  <Wand2 size={18} />生成立項書
                </button>
              )}

              {briefLoading && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">正在生成立項書...</p>
                </div>
              )}

              {/* 立項書欄位 */}
              {briefData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">📋 立項書</p>
                    <button
                      onClick={async () => {
                        setBriefData(null);
                        setBriefLoading(true);
                        try {
                          const language = detectLanguage();
                          const data = await generateWizardBrief(settings.genres, settings.tags, settings.worldview, settings.characterDesc, settings.goldenFinger, language);
                          setBriefData(data);
                        } catch (error: any) {
                          alert(`生成失敗：${error.message}`);
                        } finally {
                          setBriefLoading(false);
                        }
                      }}
                      disabled={briefLoading}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 border border-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${briefLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Wand2 size={12} />全部重新生成
                    </button>
                  </div>

                  {([
                    { key: 'titles' as BriefField, label: '📖 書名建議', rows: 3 },
                    { key: 'genre_position' as BriefField, label: '🏷️ 類型定位', rows: 2 },
                    { key: 'worldview_full' as BriefField, label: '🌍 世界觀設定', rows: 6 },
                    { key: 'character_full' as BriefField, label: '👤 主角設定', rows: 5 },
                    { key: 'goldenfinger_full' as BriefField, label: '⚡ 金手指/外掛設定', rows: 4 },
                    { key: 'selling_points' as BriefField, label: '🔥 核心賣點', rows: 4 },
                    { key: 'opening' as BriefField, label: '📋 開局構想', rows: 4 },
                  ]).map(({ key, label, rows }) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                        <button
                          onClick={async () => {
                            setFieldLoading(key);
                            try {
                              const language = detectLanguage();
                              const content = await regenerateWizardBriefField(key, settings.genres, settings.tags, settings.worldview, settings.characterDesc, settings.goldenFinger, language);
                              setBriefData(prev => prev ? { ...prev, [key]: content } : prev);
                            } catch (error: any) {
                              alert(`生成失敗：${error.message}`);
                            } finally {
                              setFieldLoading(null);
                            }
                          }}
                          disabled={fieldLoading !== null}
                          className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 border border-violet-400/50 rounded-md hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors ${fieldLoading !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {fieldLoading === key ? <><div className="animate-spin rounded-full h-3 w-3 border border-violet-500 border-t-transparent" />生成中</> : <><Wand2 size={10} />重新生成</>}
                        </button>
                      </div>
                      <textarea
                        value={briefData[key]}
                        onChange={(e) => setBriefData(prev => prev ? { ...prev, [key]: e.target.value } : prev)}
                        rows={rows}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            上一步
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg transition-all"
            >
              下一步
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl shadow-lg transition-all"
            >
              <Sparkles size={18} />
              完成創建
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
