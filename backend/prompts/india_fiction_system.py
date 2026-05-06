"""
Indian Fiction Intelligence System
Injects localized cultural and market context into the SSO AI prompts.
"""

def inject_indian_intelligence(sys_prompt: str, track: str) -> str:
    """
    Augment the prompt with Indian market/cultural logic if applicable.
    """
    if not track or "india" not in track.lower():
        return sys_prompt
        
    indian_context = """
[INDIAN MARKET CONTEXT INJECTED]
When analyzing this manuscript, apply the following Indian market standards:
1. Pacing: Indian readers tolerate longer exposition if it builds family dynamics or emotional stakes (Izzat/Dharma).
2. Relationships: Respect for elders and societal expectations are core driving forces, not just background noise.
3. Dialogue: Allow for transliteration of Indian terms without forced explanations. 
4. Structure: Multi-generational or ensemble casts are common; do not heavily penalize them for "lack of focus" if the emotional core remains strong.
5. Tropes: Arranged marriages, festival settings, and destiny/karma are valid structural load-bearing elements.
"""
    return sys_prompt + "\n\n" + indian_context
