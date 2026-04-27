export const isMatch = (input: string, target: string): boolean => {
  const getVariants = (text: string): string[] => {
    // Basic normalization: lower case, remove punctuation (except apostrophes for now)
    let s = text.toLowerCase().trim();
    s = s.replace(/["“”‘’]/g, "'").replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');

    let currentVariants = new Set<string>([s]);

    const unambiguousMap: Record<string, string> = {
      "i'm": "i am",
      "you're": "you are",
      "we're": "we are",
      "they're": "they are",
      "i've": "i have",
      "you've": "you have",
      "we've": "we have",
      "they've": "they have",
      "i'll": "i will",
      "you'll": "you will",
      "he'll": "he will",
      "she'll": "she will",
      "it'll": "it will",
      "we'll": "we will",
      "they'll": "they will",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "haven't": "have not",
      "hasn't": "has not",
      "hadn't": "had not",
      "doesn't": "does not",
      "don't": "do not",
      "didn't": "did not",
      "won't": "will not",
      "wouldn't": "would not",
      "couldn't": "could not",
      "shouldn't": "should not",
      "can't": "can not",
      "cannot": "can not",
      "gonna": "going to",
      "wanna": "want to",
      "gotta": "got to",
    };

    const ambiguousMap: Record<string, string[]> = {
      "he's": ["he is", "he has"],
      "she's": ["she is", "she has"],
      "it's": ["it is", "it has"],
      "i'd": ["i would", "i had"],
      "you'd": ["you would", "you had"],
      "he'd": ["he would", "he had"],
      "she'd": ["she would", "she had"],
      "we'd": ["we would", "we had"],
      "they'd": ["they would", "they had"],
      "let's": ["let us"],
    };

    for (const [contracted, expanded] of Object.entries(unambiguousMap)) {
      const regex = new RegExp(`\\b${contracted}\\b`, 'g');
      const nextVariants = new Set<string>();
      for (const v of currentVariants) {
        nextVariants.add(v);
        if (v.includes(contracted)) {
          nextVariants.add(v.replace(regex, expanded));
        }
      }
      currentVariants = nextVariants;
    }

    for (const [contracted, expansions] of Object.entries(ambiguousMap)) {
      const regex = new RegExp(`\\b${contracted}\\b`, 'g');
      const nextVariants = new Set<string>();
      for (const v of currentVariants) {
        nextVariants.add(v);
        if (v.includes(contracted)) {
          for (const expanded of expansions) {
            nextVariants.add(v.replace(regex, expanded));
          }
        }
      }
      currentVariants = nextVariants;
    }

    const finalVariants = new Set<string>();
    for (const v of currentVariants) {
      finalVariants.add(v.replace(/'/g, ''));
    }

    return Array.from(finalVariants);
  };

  const inputVariants = getVariants(input);
  const targetVariants = getVariants(target);

  return inputVariants.some(v1 => targetVariants.some(v2 => v1 === v2));
};
