/**
 * Author Studio Pro — Fiction Cliché Detector.
 * 100+ common fiction clichés with frequency counting.
 */

export const FICTION_CLICHES = [
    'heart pounded', 'blood ran cold', "let out a breath she didn't know she was holding",
    'jaw dropped', 'eyes widened', 'heart skipped a beat', 'butterflies in her stomach',
    'silence was deafening', 'time seemed to slow', "couldn't believe his eyes",
    'knees went weak', 'her world turned upside down', 'he let out a breath',
    'she rolled her eyes', 'darkness before the dawn', 'his eyes darkened',
    'in the blink of an eye', 'she bit her lip', 'heart hammered',
    'she held her breath', 'his jaw tightened', 'her heart sank',
    'his face was unreadable', 'she fought back tears', 'her throat tightened',
    'a shiver ran down her spine', 'he clenched his jaw', 'she blinked back tears',
    'her stomach dropped', "he couldn't breathe", 'tears streamed down her face',
    'a lump in her throat', 'his blood boiled', 'she let out a shaky breath',
    'goosebumps rose on her skin', 'her breath caught', 'he gritted his teeth',
    'waves of emotion', 'a pit in her stomach', 'his heart raced',
    'she swallowed hard', 'her hands trembled', 'a cold sweat',
    'eyes locked', 'sparks flew', 'electricity between them',
    'it was a dark and stormy night', 'little did she know',
    'suddenly everything went black', 'a single tear rolled down',
    'bolt of lightning', 'time stood still', 'the room went silent',
    'his world came crashing down', 'she saw red', 'white as a ghost',
    'green with envy', 'red as a tomato', 'dead silence',
    'deafening silence', 'piercing scream', 'blood-curdling scream',
    'bone-chilling cold', 'crystal clear', 'razor sharp',
    'needle in a haystack', 'tip of the iceberg', 'light at the end of the tunnel',
    'sigh of relief', 'weight of the world', 'burning desire',
    'inner demons', 'broken beyond repair', 'a new day dawned',
    'fate had other plans', 'only time would tell', 'in that moment',
    'everything changed', 'she knew nothing would ever be the same',
    'his touch sent shivers', 'she melted into his arms',
    'their eyes met across the room', 'he tucked a strand of hair behind her ear',
    'she didn\'t trust herself to speak', 'he searched her eyes',
    'her pulse quickened', 'his voice was like velvet',
    'a wave of nausea', 'her vision blurred', 'darkness closed in',
    'she willed herself to be strong', 'he punched the wall',
    'she collapsed onto the bed', 'he ran his fingers through his hair',
    'she chewed her bottom lip', 'his muscles tensed',
    'her fists clenched at her sides', 'cold dread settled in her stomach',
    'hot tears burned', 'she woke with a start',
    'it had all been a dream', 'the last thing she remembered',
    'everything happened so fast', 'before she knew it',
    'the air was thick with tension', 'you could cut the tension with a knife',
    'an awkward silence', 'broke the silence', 'pierced the silence',
    'shattered the silence', 'a knowing smile', 'a wicked grin',
    'his smirk widened', 'she arched an eyebrow', 'he raised an eyebrow',
];

/**
 * Detect clichés in text.
 * @param {string} text - Full manuscript text
 * @returns {{cliches: Array<{phrase: string, count: number, firstInstance: number}>, totalCount: number}}
 */
export function detectCliches(text) {
    if (!text || typeof text !== 'string' || text.trim().length < 50) {
        return { cliches: [], totalCount: 0 };
    }

    try {
        const lowerText = text.toLowerCase();
        const found = [];

        for (const phrase of FICTION_CLICHES) {
            const lowerPhrase = phrase.toLowerCase();
            const count = lowerText.split(lowerPhrase).length - 1;
            if (count > 0) {
                found.push({
                    phrase,
                    count,
                    firstInstance: lowerText.indexOf(lowerPhrase),
                });
            }
        }

        found.sort((a, b) => b.count - a.count);
        const totalCount = found.reduce((sum, c) => sum + c.count, 0);

        return { cliches: found, totalCount };
    } catch (err) {
        return { cliches: [], totalCount: 0, analysisError: err.message };
    }
}
