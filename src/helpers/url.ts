import { appConfig } from '../config';
import { PATH_METADATA } from '@nestjs/common/constants';

export const route = (
    Controller: new (...rest) => any,
    action: string,
    routeParams?: { [key: string]: any },
    baseUrl?: string,
    trailingSlash?: boolean
): string => {
    const { appBaseUrl, appGlobalRoutePrefix } = appConfig();

    const routePrefix = Reflect.getMetadata(PATH_METADATA, Controller);
    let routePath = Reflect.getMetadata(PATH_METADATA, Controller.prototype[action]);

    if (routeParams) {
        for (const key in routeParams) {
            routePath = routePath.replace(`:${key}`, routeParams[key]);
        }
    }

    return new URL(
        `${appGlobalRoutePrefix}/${routePrefix ? routePrefix + '/' : ''}${routePath}`,
        baseUrl || appBaseUrl
    ).href + (trailingSlash ? '/' : '');
}
