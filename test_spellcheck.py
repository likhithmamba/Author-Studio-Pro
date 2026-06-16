import sys
import os

class MockEnchantModule:
    class errors:
        class DictNotFoundError(Exception): pass

    class DictWithPWL:
        def __init__(self, tag, pwl):
            if tag == 'hi_IN': raise MockEnchantModule.errors.DictNotFoundError()

sys.modules['enchant'] = MockEnchantModule()

from backend.services.text_analysis.spellcheck import LANG_MAP
print(LANG_MAP)
