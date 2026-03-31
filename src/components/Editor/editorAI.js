/**
 * Author Studio Pro — Editor AI utility.
 * AI writing assists: continue scene, rewrite paragraph, suggest names.
 */

const API_URL = import.meta?.env?.VITE_API_URL || ''

async function _aiCall(apiKey, model, systemPrompt, userPrompt) {
    if (!apiKey) throw new Error('API key required for AI features. Add one in Settings.')

    // Call OpenRouter directly from browser (BYOK model)
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify({
            model: model || 'deepseek/deepseek-chat:free',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 1200,
            temperature: 0.7,
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `AI request failed (${res.status})`)
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

/**
 * Continue the scene from where the writer left off.
 * @param {string} context - Last ~500 words of the chapter
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>} Generated continuation
 */
export async function continueScene(context, apiKey, model) {
    return _aiCall(
        apiKey,
        model,
        `You are a fiction ghostwriter. Continue the scene naturally from where the author stopped.
Rules:
- Match the author's voice, tense, and POV exactly
- Write 150-300 words
- Do NOT summarise, do NOT add meta-commentary
- Just continue the prose seamlessly`,
        `Continue this scene:\n\n${context.slice(-2000)}`
    )
}

/**
 * Rewrite a paragraph while preserving meaning and improving prose.
 * @param {string} paragraph - The paragraph to rewrite
 * @param {string} instruction - Optional rewrite instruction
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>} Rewritten paragraph
 */
export async function rewriteParagraph(paragraph, instruction, apiKey, model) {
    const instr = instruction || 'Improve the prose quality — tighten language, strengthen verbs, remove clichés.'
    return _aiCall(
        apiKey,
        model,
        `You are a developmental editor. Rewrite the paragraph following the instruction.
Rules:
- Preserve the original meaning and events
- Match the author's voice and style
- Return ONLY the rewritten paragraph, no explanations`,
        `Instruction: ${instr}\n\nOriginal paragraph:\n${paragraph}`
    )
}

/**
 * Generate character name suggestions.
 * @param {string} context - Brief description (genre, setting, character role)
 * @param {string} apiKey
 * @param {string} model
 * @returns {Promise<string>} List of name suggestions
 */
export async function suggestNames(context, apiKey, model) {
    return _aiCall(
        apiKey,
        model,
        `You are a writing assistant specialising in character naming.
Generate 8 character name suggestions that fit the context.
Format: one name per line, with a brief note on origin/feel.
Example: "Elena Voronova — Russian, scholarly feel"`,
        `Context: ${context}`
    )
}
