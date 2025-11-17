export declare function cleanString(stringValue: string): string;
export declare function setSize(stringValue: string, size: number): string;
export declare function throttle<Params extends any[]>(func: (...args: Params) => any, delay: number): (...args: Params) => void;
export declare function digits(value: number): number;
export declare function addNumberOfDigs(number: any, currentPosOfDims: any, dimensionName: any, key: any): void;
export declare function isElementVisible(element: {
    node: () => {
        (): any;
        new (): any;
        getBoundingClientRect: {
            (): any;
            new (): any;
        };
        contains: {
            (arg0: Element): any;
            new (): any;
        };
    };
}): any;
export declare function getMouseCoords(event: {
    clientX: number;
    clientY: number;
}, targetContainer?: HTMLElement): number[];
