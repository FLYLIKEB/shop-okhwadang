import { SearchController } from './search.controller';

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(() => {
    controller = new SearchController();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 옥화당-relevant popular keywords', () => {
    const result = controller.popular();
    expect(result.keywords).toContain('자사호');
    expect(result.keywords).toContain('보이차');
    expect(result.keywords).toContain('다구');
    expect(result.keywords).toContain('찻잔');
    expect(result.keywords).toContain('개완');
  });

  it('should not contain Nike/Adidas/jeans keywords', () => {
    const result = controller.popular();
    expect(result.keywords).not.toContain('Nike');
    expect(result.keywords).not.toContain('Adidas');
    expect(result.keywords).not.toContain('jeans');
  });

  it('should return non-empty keywords array', () => {
    const result = controller.popular();
    expect(result.keywords.length).toBeGreaterThan(0);
  });
});
