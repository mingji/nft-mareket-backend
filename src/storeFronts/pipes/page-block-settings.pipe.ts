import { BadRequestException, Inject, Injectable, PipeTransform, Scope } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { StoreFrontPageBlockDto } from '../dto/store-front-page-blocks-settings.dto';
import { StoreFrontPageBlockSetting } from '../types/constants';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class PageBlockSettingsPipe implements PipeTransform<string> {
    constructor(@Inject(REQUEST) private request: Request) {}

    async transform(data: any): Promise<StoreFrontPageBlockDto> {
        if (!Array.isArray(data)) {
            throw new BadRequestException();
        }
        const result: StoreFrontPageBlockDto = [];
        for (const block of data) {
            const dto = StoreFrontPageBlockSetting[block.type];

            if (!dto) {
                throw new BadRequestException();
            }

            const createdDto = plainToClass(
                dto,
                { ...block, id: this.request.params.id },
                { enableImplicitConversion: true }
            ) as typeof dto;

            if (!createdDto.id) {
                throw new BadRequestException();
            }

            const errors: any = await validate(
                createdDto,
                { groups: [block.type], always: true, whitelist: true }
            );

            if (errors.length) {
                throw new BadRequestException(errors);
            }
            result.push(createdDto as typeof dto);
        }

        return result;
    }
}
