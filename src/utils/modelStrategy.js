/**
 * Author Studio Pro — AI model routing strategy.
 * Routes free-tier models to the best match per feature type.
 */

const FREE_TIER_MAP = {
    chapter_detection: 'meta-llama/llama-3.2-3b-instruct:free',
    editorial:         'deepseek/deepseek-chat:free',
    query_generation:  'deepseek/deepseek-chat:free',
    continue_scene:    'mistralai/mistral-nemo:free',
    rewrite:           'deepseek/deepseek-chat:free',
    summarise:         'google/gemma-3-27b-it:free',
    names:             'meta-llama/llama-3.2-3b-instruct:free',
}

const DEFAULT_MODEL = 'deepseek/deepseek-chat:free'

/**
 * Get the optimal model for a feature.
 * If userModel is not a free-tier model, returns it unchanged.
 * If free-tier, routes to the best model for the feature.
 */
export function getOptimalModel(feature, userModel) {
    if (!userModel) return DEFAULT_MODEL;
    if (!isFreeTier(userModel)) return userModel;
    return FREE_TIER_MAP[feature] || userModel;
}

/**
 * Check if a model string is a free-tier model.
 */
export function isFreeTier(model) {
    return typeof model === 'string' && model.endsWith(':free');
}
