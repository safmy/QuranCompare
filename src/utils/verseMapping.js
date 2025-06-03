// Accurate mapping of Surah:Verse to absolute verse numbers for Al-Quran Cloud API
// This maps each surah to its starting absolute verse number

export const SURAH_VERSE_STARTS = {
  1: 1,     // Al-Fatiha starts at verse 1
  2: 8,     // Al-Baqarah starts at verse 8 (1+7)
  3: 294,   // Aal-E-Imran starts at verse 294 (8+286)
  4: 494,   // An-Nisa starts at verse 494 (294+200)
  5: 670,   // Al-Maidah starts at verse 670 (494+176)
  6: 791,   // Al-An'am starts at verse 791 (670+121)
  7: 957,   // Al-A'raf starts at verse 957 (791+166)
  8: 1033,  // Al-Anfal starts at verse 1033 (957+76)
  9: 1162,  // At-Tawbah starts at verse 1162 (1033+129)
  10: 1292, // Yunus starts at verse 1292 (1162+130)
  11: 1402, // Hud starts at verse 1402 (1292+110)
  12: 1525, // Yusuf starts at verse 1525 (1402+123)
  13: 1636, // Ar-Ra'd starts at verse 1636 (1525+111)
  14: 1679, // Ibrahim starts at verse 1679 (1636+43)
  15: 1731, // Al-Hijr starts at verse 1731 (1679+52)
  16: 1830, // An-Nahl starts at verse 1830 (1731+99)
  17: 1959, // Al-Isra starts at verse 1959 (1830+129)
  18: 2070, // Al-Kahf starts at verse 2070 (1959+111)
  19: 2181, // Maryam starts at verse 2181 (2070+111)
  20: 2269, // Ta-Ha starts at verse 2269 (2181+88)
  21: 2404, // Al-Anbiya starts at verse 2404 (2269+135)
  22: 2517, // Al-Hajj starts at verse 2517 (2404+113)
  23: 2596, // Al-Mu'minun starts at verse 2596 (2517+79)
  24: 2715, // An-Nur starts at verse 2715 (2596+119)
  25: 2793, // Al-Furqan starts at verse 2793 (2715+78)
  26: 2871, // Ash-Shu'ara starts at verse 2871 (2793+78)
  27: 2999, // An-Naml starts at verse 2999 (2871+128)
  28: 3088, // Al-Qasas starts at verse 3088 (2999+89)
  29: 3177, // Al-Ankabut starts at verse 3177 (3088+89)
  30: 3247, // Ar-Rum starts at verse 3247 (3177+70)
  31: 3308, // Luqman starts at verse 3308 (3247+61)
  32: 3339, // As-Sajdah starts at verse 3339 (3308+31)
  33: 3370, // Al-Ahzab starts at verse 3370 (3339+31)
  34: 3444, // Saba starts at verse 3444 (3370+74)
  35: 3499, // Fatir starts at verse 3499 (3444+55)
  36: 3545, // Ya-Sin starts at verse 3545 (3499+46)
  37: 3629, // As-Saffat starts at verse 3629 (3545+84)
  38: 3713, // Sad starts at verse 3713 (3629+84)
  39: 3802, // Az-Zumar starts at verse 3802 (3713+89)
  40: 3877, // Ghafir starts at verse 3877 (3802+75)
  41: 3962, // Fussilat starts at verse 3962 (3877+85)
  42: 4017, // Ash-Shuraa starts at verse 4017 (3962+55)
  43: 4071, // Az-Zukhruf starts at verse 4071 (4017+54)
  44: 4160, // Ad-Dukhan starts at verse 4160 (4071+89)
  45: 4220, // Al-Jathiyah starts at verse 4220 (4160+60)
  46: 4257, // Al-Ahqaf starts at verse 4257 (4220+37)
  47: 4293, // Muhammad starts at verse 4293 (4257+36)
  48: 4332, // Al-Fath starts at verse 4332 (4293+39)
  49: 4361, // Al-Hujurat starts at verse 4361 (4332+29)
  50: 4380, // Qaf starts at verse 4380 (4361+19)
  51: 4426, // Adh-Dhariyat starts at verse 4426 (4380+46)
  52: 4487, // At-Tur starts at verse 4487 (4426+61)
  53: 4537, // An-Najm starts at verse 4537 (4487+50)
  54: 4600, // Al-Qamar starts at verse 4600 (4537+63)
  55: 4656, // Ar-Rahman starts at verse 4656 (4600+56)
  56: 4735, // Al-Waqi'ah starts at verse 4735 (4656+79)
  57: 4831, // Al-Hadid starts at verse 4831 (4735+96)
  58: 4860, // Al-Mujadila starts at verse 4860 (4831+29)
  59: 4885, // Al-Hashr starts at verse 4885 (4860+25)
  60: 4910, // Al-Mumtahanah starts at verse 4910 (4885+25)
  61: 4924, // As-Saff starts at verse 4924 (4910+14)
  62: 4939, // Al-Jumu'ah starts at verse 4939 (4924+15)
  63: 4950, // Al-Munafiqun starts at verse 4950 (4939+11)
  64: 4969, // At-Taghabun starts at verse 4969 (4950+19)
  65: 4988, // At-Talaq starts at verse 4988 (4969+19)
  66: 5001, // At-Tahrim starts at verse 5001 (4988+13)
  67: 5013, // Al-Mulk starts at verse 5013 (5001+12)
  68: 5044, // Al-Qalam starts at verse 5044 (5013+31)
  69: 5096, // Al-Haqqah starts at verse 5096 (5044+52)
  70: 5149, // Al-Ma'arij starts at verse 5149 (5096+53)
  71: 5193, // Nuh starts at verse 5193 (5149+44)
  72: 5222, // Al-Jinn starts at verse 5222 (5193+29)
  73: 5251, // Al-Muzzammil starts at verse 5251 (5222+29)
  74: 5271, // Al-Muddaththir starts at verse 5271 (5251+20)
  75: 5328, // Al-Qiyamah starts at verse 5328 (5271+57)
  76: 5369, // Al-Insan starts at verse 5369 (5328+41)
  77: 5401, // Al-Mursalat starts at verse 5401 (5369+32)
  78: 5452, // An-Naba starts at verse 5452 (5401+51)
  79: 5493, // An-Nazi'at starts at verse 5493 (5452+41)
  80: 5540, // Abasa starts at verse 5540 (5493+47)
  81: 5583, // At-Takwir starts at verse 5583 (5540+43)
  82: 5612, // Al-Infitar starts at verse 5612 (5583+29)
  83: 5632, // Al-Mutaffifin starts at verse 5632 (5612+20)
  84: 5669, // Al-Inshiqaq starts at verse 5669 (5632+37)
  85: 5695, // Al-Buruj starts at verse 5695 (5669+26)
  86: 5718, // At-Tariq starts at verse 5718 (5695+23)
  87: 5736, // Al-A'la starts at verse 5736 (5718+18)
  88: 5756, // Al-Ghashiyah starts at verse 5756 (5736+20)
  89: 5783, // Al-Fajr starts at verse 5783 (5756+27)
  90: 5814, // Al-Balad starts at verse 5814 (5783+31)
  91: 5835, // Ash-Shams starts at verse 5835 (5814+21)
  92: 5851, // Al-Layl starts at verse 5851 (5835+16)
  93: 5873, // Ad-Duhaa starts at verse 5873 (5851+22)
  94: 5885, // Ash-Sharh starts at verse 5885 (5873+12)
  95: 5894, // At-Tin starts at verse 5894 (5885+9)
  96: 5903, // Al-Alaq starts at verse 5903 (5894+9)
  97: 5923, // Al-Qadr starts at verse 5923 (5903+20)
  98: 5929, // Al-Bayyinah starts at verse 5929 (5923+6)
  99: 5938, // Az-Zalzalah starts at verse 5938 (5929+9)
  100: 5947, // Al-Adiyat starts at verse 5947 (5938+9)
  101: 5959, // Al-Qari'ah starts at verse 5959 (5947+12)
  102: 5971, // At-Takathur starts at verse 5971 (5959+12)
  103: 5980, // Al-Asr starts at verse 5980 (5971+9)
  104: 5984, // Al-Humazah starts at verse 5984 (5980+4)
  105: 5993, // Al-Fil starts at verse 5993 (5984+9)
  106: 5999, // Quraysh starts at verse 5999 (5993+6)
  107: 6003, // Al-Ma'un starts at verse 6003 (5999+4)
  108: 6011, // Al-Kawthar starts at verse 6011 (6003+8)
  109: 6015, // Al-Kafirun starts at verse 6015 (6011+4)
  110: 6021, // An-Nasr starts at verse 6021 (6015+6)
  111: 6025, // Al-Masad starts at verse 6025 (6021+4)
  112: 6031, // Al-Ikhlas starts at verse 6031 (6025+6)
  113: 6036, // Al-Falaq starts at verse 6036 (6031+5)
  114: 6041  // An-Nas starts at verse 6041 (6036+5)
};

/**
 * Convert a Surah:Verse reference to absolute verse number for API calls
 * @param {string} reference - Format "2:255" or "[2:255]"
 * @returns {number|null} - Absolute verse number or null if invalid
 */
export const getAbsoluteVerseNumber = (reference) => {
  if (!reference) return null;
  
  // Remove brackets and parse
  const cleaned = reference.replace(/[[\]]/g, '');
  const parts = cleaned.split(':');
  
  if (parts.length !== 2) return null;
  
  const surah = parseInt(parts[0]);
  const verse = parseInt(parts[1]);
  
  if (isNaN(surah) || isNaN(verse) || surah < 1 || surah > 114 || verse < 1) {
    return null;
  }
  
  // Get the starting verse number for this surah
  const startVerse = SURAH_VERSE_STARTS[surah];
  if (!startVerse) return null;
  
  // Calculate absolute verse number
  return startVerse + verse - 1;
};

/**
 * Get the audio URL for a verse from multiple CDN providers with fallback
 * @param {string} reference - Verse reference like "2:255"
 * @param {number} bitrate - Audio quality (192, 128, 64, 48, 40, 32)
 * @param {number} provider - Provider index (0=primary, 1=fallback1, 2=fallback2)
 * @returns {string|null} - Audio URL or null if invalid reference
 */
export const getVerseAudioUrl = (reference, bitrate = 64, provider = 0) => {
  const verseNumber = getAbsoluteVerseNumber(reference);
  if (!verseNumber) return null;
  
  // Multiple CDN providers for better reliability
  const providers = [
    // Primary: Al-Quran Cloud (good quality, some rate limiting)
    `https://cdn.islamic.network/quran/audio/${bitrate}/ar.alafasy/${verseNumber}.mp3`,
    
    // Fallback 1: EveryAyah.com (reliable, different server)
    `https://everyayah.com/data/Alafasy_128kbps/${String(verseNumber).padStart(6, '0')}.mp3`,
    
    // Fallback 2: Quran.com CDN (if available)
    `https://audio.qurancdn.com/Alafasy/Warsh/${String(verseNumber).padStart(3, '0')}.mp3`,
    
    // Fallback 3: Archive.org backup
    `https://ia902709.us.archive.org/13/items/mishary-rashid-alafasy-complete-quran/${String(verseNumber).padStart(3, '0')}.mp3`
  ];
  
  return providers[provider] || providers[0];
};

/**
 * Get all available audio URLs for a verse (for fallback purposes)
 * @param {string} reference - Verse reference like "2:255"
 * @param {number} bitrate - Audio quality
 * @returns {Array} - Array of audio URLs
 */
export const getAllVerseAudioUrls = (reference, bitrate = 64) => {
  const verseNumber = getAbsoluteVerseNumber(reference);
  if (!verseNumber) return [];
  
  return [
    getVerseAudioUrl(reference, bitrate, 0),
    getVerseAudioUrl(reference, bitrate, 1),
    getVerseAudioUrl(reference, bitrate, 2),
    getVerseAudioUrl(reference, bitrate, 3)
  ].filter(Boolean);
};