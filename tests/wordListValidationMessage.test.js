import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_MESSAGE =
  'Lütfen bu alanı doldurun yada AI ile Tamamla ile bilgileri doldurtarak kaydedebilirsiniz.';

test('WordList.tsx uses custom required validation message guiding user to AI ile Tamamla', () => {
  const code = fs.readFileSync(path.resolve('src/components/WordList.tsx'), 'utf8');

  assert.ok(
    code.includes(EXPECTED_MESSAGE),
    `WordList.tsx must include the exact custom validation message: "${EXPECTED_MESSAGE}"`
  );

  assert.ok(
    code.includes('setCustomValidity'),
    'WordList.tsx must use HTML5 Constraint Validation API (setCustomValidity)'
  );

  assert.ok(
    code.includes('onInvalid'),
    'WordList.tsx required inputs must handle onInvalid to set custom validation message'
  );

  // Must reset custom validity when input changes or programmatic state updates (e.g. AI fill)
  assert.match(
    code,
    /setCustomValidity\(\s*['"]['"]\s*\)/,
    'WordList.tsx must clear custom validity (setCustomValidity("")) on input change and AI fill'
  );
});

test('Constraint validation lifecycle simulation: submit without AI shows hint, AI fill clears validity', () => {
  // Simulate an input element's ValidityState lifecycle
  const createMockInput = (initialValue = '', required = true) => {
    let value = initialValue;
    let customError = '';
    const listeners = {};

    return {
      get value() {
        return value;
      },
      set value(v) {
        value = v;
      },
      get validity() {
        const valueMissing = required && value.trim().length === 0;
        const hasCustom = customError.length > 0;
        return {
          valueMissing,
          customError: hasCustom,
          valid: !valueMissing && !hasCustom,
        };
      },
      get validationMessage() {
        if (customError) return customError;
        if (required && value.trim().length === 0) return 'Lütfen bu alanı doldurun.';
        return '';
      },
      setCustomValidity(msg) {
        customError = msg;
      },
      onInvalid() {
        if (this.validity.valueMissing) {
          this.setCustomValidity(EXPECTED_MESSAGE);
        }
      },
      onChange(nextVal) {
        this.setCustomValidity('');
        value = nextVal;
      },
      onProgrammaticFill(nextVal) {
        value = nextVal;
        this.setCustomValidity('');
      },
    };
  };

  const trInput = createMockInput('', true);
  const engInput = createMockInput('hopscotch', true);

  // 1. User clicks "Listeye Kaydet" without clicking "AI ile Tamamla"
  assert.equal(trInput.validity.valid, false);
  trInput.onInvalid();
  assert.equal(trInput.validationMessage, EXPECTED_MESSAGE);

  // 2. User clicks "AI ile Tamamla" which populates Turkish meaning programmatically
  trInput.onProgrammaticFill('seksek');
  assert.equal(trInput.validity.customError, false);
  assert.equal(trInput.validity.valid, true);
  assert.equal(engInput.validity.valid, true);
});
