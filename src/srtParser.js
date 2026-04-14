export const parseSRT = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.split('\n');
  const sentences = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      // Logic suitable for SRT
      let contentLine = lines[i + 1]?.trim() || '';
      if (contentLine) {
        sentences.push(contentLine);
      }
    }
  }
  return sentences;
};

export const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const tokenizeSentence = (sentence) => {
  const words = sentence.split(/\s+/).filter(word => word.length > 0);
  const blocks = [];
  for (let i = 0; i < words.length; i += 3) {
    blocks.push(words.slice(i, i + 3).join(' '));
  }
  return blocks;
};
