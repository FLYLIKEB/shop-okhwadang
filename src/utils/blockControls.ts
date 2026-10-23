export function englishBlockControls(content: Record<string, unknown>): Record<string, unknown> {
  const translated = { ...content };
  for (const key of ['cta_text', 'button_text']) {
    const english = content[`${key}_en`];
    if (typeof english === 'string' && english.trim()) translated[key] = english;
  }
  if (Array.isArray(content.slides)) {
    translated.slides = content.slides.map((slide: unknown) =>
      slide && typeof slide === 'object' && !Array.isArray(slide)
        ? englishBlockControls(slide as Record<string, unknown>)
        : slide,
    );
  }
  return translated;
}
