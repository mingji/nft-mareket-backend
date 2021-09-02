import { IsSlugPipe } from '../../src/pipes/is-slug.pipe';
import { NotFoundException } from '@nestjs/common';

describe('Is slug pipe', () => {
    let pipe: IsSlugPipe;

    beforeEach(async () => {
        pipe = new IsSlugPipe();
    });

    it('should be success return slug 1 word', async () => {
        const slug = 'test';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should be success return slug 2 word', async () => {
        const slug = 'test-test';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should be success return slug 2 word upper', async () => {
        const slug = 'test-TEST';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should be success return slug 1 number', async () => {
        const slug = '123';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should be success return slug 2 number', async () => {
        const slug = '123-456';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should be success return slug word + number', async () => {
        const slug = 'test-123';
        expect(await pipe.transform(slug)).toBe(slug);
    });

    it('should throw 404 part 1', async () => {
        expect(() => pipe.transform('test-')).toThrow(NotFoundException);
    });

    it('should throw 404 part 2', async () => {
        expect(() => pipe.transform('test ')).toThrow(NotFoundException);
    });

    it('should throw 404 part 2', async () => {
        expect(() => pipe.transform('test test')).toThrow(NotFoundException);
    });

    it('should throw 404 part 3', async () => {
        expect(() => pipe.transform('-')).toThrow(NotFoundException);
    });

    it('should throw 404 part 4', async () => {
        expect(() => pipe.transform('-test')).toThrow(NotFoundException);
    });

    it('should throw 404 part 5', async () => {
        expect(() => pipe.transform('-test-')).toThrow(NotFoundException);
    });

    it('should throw 404 part 6', async () => {
        expect(() => pipe.transform('test---')).toThrow(NotFoundException);
    });

    it('should throw 404 part 7', async () => {
        expect(() => pipe.transform('test-$-test')).toThrow(NotFoundException);
    });
});