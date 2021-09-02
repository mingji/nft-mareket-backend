import { DynamicModule, Module } from '@nestjs/common';
import { Provider } from '@nestjs/common/interfaces/modules/provider.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { ForwardReference } from '@nestjs/common/interfaces/modules/forward-reference.interface';

export interface DaoModuleOptions {
    imports: Array<Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference>;
    providers: Provider[];
    exports: Provider[];
}

@Module({})
export class DaoModule {
    static forFeature(daoOptions: DaoModuleOptions): DynamicModule {
        return { module: DaoModule, ...daoOptions };
    }
}
