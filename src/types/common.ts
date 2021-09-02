export type TLocalesDictionary = {
    [s: string]: string
};

export interface IPaginatedList<T> {
    data: Array<T>;
    total: number;
    offset?: number;
    limit?: number;
}