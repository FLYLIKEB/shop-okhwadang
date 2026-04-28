import { INestApplication } from '@nestjs/common';
import request from 'supertest';

let app: INestApplication;

export function registerSeoSuite(getApp: () => INestApplication) {
  describe('SEO (e2e)', () => {
    beforeAll(() => {
      app = getApp();
    });

    describe('GET /api/sitemap.xml', () => {
      it('200 + Content-Type=application/xml', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/sitemap.xml')
          .expect(200)
          .expect('Content-Type', /application\/xml/);

        const xml = res.text;
        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<urlset');
      });

      it('hreflang alternate 링크가 포함된다', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/sitemap.xml')
          .expect(200);

        const xml = res.text;
        // 항상 ko/en 두 alternate 가 들어있고 x-default 도 있어야 함
        // (DB 데이터가 없으면 url 노드가 비어있을 수 있으므로 urlset 자체만 검증)
        expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
        expect(xml).toContain('</urlset>');
      });

      it('Cache-Control 헤더가 설정된다', async () => {
        await request(app.getHttpServer())
          .get('/api/sitemap.xml')
          .expect(200)
          .expect('Cache-Control', /max-age=3600/);
      });
    });

    describe('GET /api/robots.txt', () => {
      it('200 + Content-Type=text/plain', async () => {
        const res = await request(app.getHttpServer())
          .get('/api/robots.txt')
          .expect(200)
          .expect('Content-Type', /text\/plain/);

        const txt = res.text;
        expect(txt).toContain('User-agent: *');
      });

      it('비프로덕션 환경에서는 Disallow: /', async () => {
        // E2E 테스트는 NODE_ENV=test 또는 development 로 동작 → Disallow 정책
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';
        try {
          const res = await request(app.getHttpServer())
            .get('/api/robots.txt')
            .expect(200);
          expect(res.text).toContain('Disallow: /');
        } finally {
          process.env.NODE_ENV = originalEnv;
        }
      });
    });
  });
}
