/**
 * Smart Arabic Search Engine for Dukkana (دكانة)
 *
 * Implements:
 * 1. Diacritics (Tashkeel) removal
 * 2. Letter normalization (أ, إ, آ -> ا), (ة -> ه), (ى -> ي), (ؤ, ئ -> ء)
 * 3. Definite article handling ("الـ", "والـ", "كالـ")
 * 4. Token fuzzy similarity & Levenshtein distance for typos
 * 5. Synonym expansion (e.g. تمر/تمور, لحم/كباب, شاي/استكان)
 */

export function normalizeArabicText(text: string): string {
  if (!text) return '';

  let normalized = text.trim().toLowerCase();

  // 1. Remove Tashkeel (harakat)
  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');

  // 2. Remove Tatweel (kashida)
  normalized = normalized.replace(/\u0640/g, '');

  // 3. Normalize Alef variations (أ, إ, آ, ٱ -> ا)
  normalized = normalized.replace(/[أإآٱ]/g, 'ا');

  // 4. Normalize Taa Marbuta (ة -> ه)
  normalized = normalized.replace(/ة/g, 'ه');

  // 5. Normalize Alif Maqsura (ى -> ي)
  normalized = normalized.replace(/ى/g, 'ي');

  // 6. Normalize Hamza variants
  normalized = normalized.replace(/[ؤئ]/g, 'ء');

  // 7. Strip punctuation
  normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟،]/g, ' ');

  // 8. Collapse spaces
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Strips common Arabic prefixes (like definite article "ال")
 */
export function stripArabicPrefixes(word: string): string {
  if (word.startsWith('ال') && word.length > 3) {
    return word.substring(2);
  }
  if (word.startsWith('وال') && word.length > 4) {
    return word.substring(3);
  }
  if (word.startsWith('كال') && word.length > 4) {
    return word.substring(3);
  }
  if (word.startsWith('بال') && word.length > 4) {
    return word.substring(3);
  }
  return word;
}

/**
 * Simple Levenshtein distance calculation for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Comprehensive Iraqi Dialect Semantic Dictionary
 * Maps common Iraqi terms (دارجة) to formal and alternative product terms
 */
export const IRAQI_DIALECT_MAP: Record<string, string[]> = {
  // الأحذية
  'قندرة': ['حذاء', 'بوط', 'نعال', 'سنيكرز', 'شوز', 'جوتي', 'كعب'],
  'قندر': ['حذاء', 'بوط', 'نعال', 'سنيكرز'],
  'شحاطة': ['نعال', 'سليبر', 'صندل', 'حذاء'],
  'شحاطه': ['نعال', 'سليبر', 'صندل', 'حذاء'],
  'بوط': ['حذاء', 'قندرة', 'بوت', 'هاف بوط'],
  'حذاء': ['قندرة', 'بوط', 'شحاطة', 'سنيكرز', 'جوتي'],
  // الملابس والأزياء
  'تراكسود': ['بدلة رياضية', 'ملابس رياضية', 'ترنج', 'بجامة', 'طقم رياضي', 'تراك'],
  'تراك': ['بدلة رياضية', 'تراكسود', 'ملابس رياضية'],
  'دشداشة': ['ثوب', 'مخور', 'زي عربي', 'عباءة', 'دراعة', 'جلابية'],
  'دشداشه': ['ثوب', 'مخور', 'زي عربي', 'عباءة', 'دراعة', 'جلابية'],
  'ثوب': ['دشداشة', 'ملابس', 'عباءة'],
  'قاط': ['بدلة', 'ملابس رسمية', 'جاكيت', 'طقم رسمي', 'بليزر'],
  'بدلة': ['قاط', 'ملابس رسمية', 'طقم'],
  'يلك': ['صديرية', 'فيست', 'جاكيت بدون اكمام'],
  'بشت': ['عباءة', 'زي عربي', 'روب'],
  'عكال': ['عقال', 'زي عربي'],
  'يشماغ': ['شماغ', 'غترة'],
  // الأثاث والمنزل
  'ميز': ['طاولة', 'مكتب', 'مائدة', 'أثاث', 'طبلية'],
  'طاولة': ['ميز', 'مكتب', 'مائدة'],
  'بنكة': ['مروحة', 'تهوية', 'مكيف'],
  'مروحة': ['بنكة', 'تهوية'],
  'سبلت': ['مكيف', 'تبريد', 'تكييف', 'سبلت يونيت'],
  'مكيف': ['سبلت', 'تبريد', 'تكييف'],
  'طباخ': ['فرن', 'غاز', 'موقد'],
  'ثلاجة': ['براد', 'مجميدة', 'فريزر'],
  'براد': ['ثلاجة', 'مبرد', 'كولر'],
  'مجميدة': ['فريزر', 'ثلاجة'],
  'قوري': ['إبريق', 'غلاية', 'براد شاي'],
  'استكان': ['كوب شاي', 'كاسات', 'طقم شاي', 'فنجان'],
  'جدر': ['قدر', 'طنجرة', 'أواني طبخ'],
  // الأجهزة والإلكترونيات
  'مبايل': ['هاتف', 'موبايل', 'جوال', 'ايفون', 'سامسونج', 'تلفون'],
  'موبايل': ['مبايل', 'هاتف', 'جوال', 'تلفون'],
  'هاتف': ['مبايل', 'موبايل', 'جوال', 'تلفون'],
  'لابتوب': ['حاسوب', 'كمبيوتر', 'نوت بوك'],
  'حاسوب': ['لابتوب', 'كمبيوتر'],
  'شاحن': ['كيبل', 'واير', 'شاحنة', 'محول'],
  'واير': ['سلك', 'كيبل', 'شاحن'],
  'ساعة': ['سمارت ووتش', 'ساعة يد', 'أكسسوارات'],
  'ماطور': ['دراجة', 'سكوتر', 'موتور', 'دباب'],
  // الأطعمة والتمور
  'كليجة': ['معمول', 'حلويات', 'كعك عراقي'],
  'دهين': ['حلويات', 'دهين نجفي'],
  'تمور': ['تمر', 'خستاوي', 'برحي', 'زهدي', 'بربن'],
  'تمر': ['تمور', 'رطب', 'خستاوي', 'برحي'],
};

/**
 * Checks if a target Arabic string matches a query token intelligently,
 * including checking Iraqi dialect synonyms.
 */
export function matchesArabicToken(targetText: string, queryToken: string): boolean {
  const normTarget = normalizeArabicText(targetText);
  const normQuery = normalizeArabicText(queryToken);

  if (!normQuery) return true;

  // 1. Direct substring match
  if (normTarget.includes(normQuery)) {
    return true;
  }

  // 2. Prefix-stripped match
  const strippedQuery = stripArabicPrefixes(normQuery);
  if (strippedQuery.length >= 2 && normTarget.includes(strippedQuery)) {
    return true;
  }

  // 3. Iraqi dialect semantic synonyms expansion
  const dialectSynonyms = IRAQI_DIALECT_MAP[normQuery] || IRAQI_DIALECT_MAP[strippedQuery] || [];
  for (const synonym of dialectSynonyms) {
    const normSynonym = normalizeArabicText(synonym);
    if (normTarget.includes(normSynonym)) {
      return true;
    }
    const strippedSynonym = stripArabicPrefixes(normSynonym);
    if (strippedSynonym.length >= 2 && normTarget.includes(strippedSynonym)) {
      return true;
    }
  }

  // 4. Word-by-word comparison with Levenshtein tolerance
  const targetWords = normTarget.split(' ').map(stripArabicPrefixes);
  for (const word of targetWords) {
    if (word.includes(strippedQuery) || strippedQuery.includes(word)) {
      return true;
    }

    // Levenshtein check for typos if words are long enough
    if (word.length >= 4 && strippedQuery.length >= 4) {
      const distance = levenshteinDistance(word, strippedQuery);
      if (distance <= 1) { // 1 character typo allowed
        return true;
      }
    }
  }

  return false;
}

/**
 * Smart product search evaluator
 */
export function smartArabicSearchMatch(
  fieldsToSearch: (string | undefined | null)[],
  searchQuery: string
): { matches: boolean; score: number } {
  if (!searchQuery.trim()) {
    return { matches: true, score: 0 };
  }

  const queryTokens = normalizeArabicText(searchQuery).split(' ').filter(Boolean);
  if (queryTokens.length === 0) {
    return { matches: true, score: 0 };
  }

  const combinedTarget = fieldsToSearch.filter(Boolean).join(' ');
  let matchedTokensCount = 0;
  let exactMatchBonus = 0;

  for (const token of queryTokens) {
    if (matchesArabicToken(combinedTarget, token)) {
      matchedTokensCount++;
      if (normalizeArabicText(combinedTarget).includes(token)) {
        exactMatchBonus += 2;
      }
    }
  }

  // At least 50% of query tokens must match or single token match
  const matchRatio = matchedTokensCount / queryTokens.length;
  const matches = matchRatio >= 0.5 || matchedTokensCount === queryTokens.length;
  const score = matchedTokensCount * 5 + exactMatchBonus;

  return { matches, score };
}
