import time
from functools import lru_cache
from typing import List

class AnalyzerOld:
    def _count_syllables(self, word: str) -> int:
        word = word.lower().strip(".,!?;:\"'")
        if not word: return 0
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel: count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1: count -= 1
        return max(1, count)

    def _compute_readability(self, sentences, words):
        n_sentences = len(sentences)
        n_words = len(words)
        n_syllables = sum(self._count_syllables(w) for w in words)
        complex_words = sum(1 for w in words if self._count_syllables(w) >= 3)
        return n_syllables, complex_words

class AnalyzerNew:
    @staticmethod
    @lru_cache(maxsize=10000)
    def _count_syllables(word: str) -> int:
        word = word.lower().strip(".,!?;:\"'")
        if not word: return 0
        vowels = "aeiouy"
        count = 0
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel: count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1: count -= 1
        return max(1, count)

    def _compute_readability(self, sentences, words):
        n_sentences = len(sentences)
        n_words = len(words)

        n_syllables = 0
        complex_words = 0
        for w in words:
            syl_count = self._count_syllables(w)
            n_syllables += syl_count
            if syl_count >= 3:
                complex_words += 1

        return n_syllables, complex_words

import random
words = ["the", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog", "beautiful", "exquisite", "magnificent", "phenomenal", "unbelievable"]
test_words = [random.choice(words) for _ in range(100000)]
sentences = [""] * 10000

old = AnalyzerOld()
t0 = time.time()
old._compute_readability(sentences, test_words)
t1 = time.time()

new = AnalyzerNew()
t2 = time.time()
new._compute_readability(sentences, test_words)
t3 = time.time()

print(f"Old: {t1 - t0:.4f}s")
print(f"New: {t3 - t2:.4f}s")
print(f"Speedup: {(t1 - t0) / (t3 - t2):.2f}x")
