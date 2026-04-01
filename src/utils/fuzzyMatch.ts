function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function calculatePhraseAccuracy(inputStr: string, targetStr: string) {
  const cleanInput = inputStr.trim().toLowerCase().replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  const cleanTarget = targetStr.trim().toLowerCase().replace(/[.,\/#!$%^&*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");

  if (!cleanInput) return { accuracy: 0 };
  if (cleanInput === cleanTarget) return { accuracy: 100 };

  const distance = levenshteinDistance(cleanInput, cleanTarget);
  const maxLength = Math.max(cleanInput.length, cleanTarget.length);
  
  if (maxLength === 0) return { accuracy: 100 };

  const accuracyRatio = Math.max(0, 1 - (distance / maxLength));
  return { accuracy: Math.round(accuracyRatio * 100) };
}


