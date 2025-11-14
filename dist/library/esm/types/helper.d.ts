export declare function prepareData(data: [], dimensions: any): any;
export declare function setupYScales(header: any, dataset: any): any;
export declare function setupXScales(header: any): any;
export declare function setupYAxis(yScales: any, dataset: any, hiddenDims: any): any;
export declare function linePath(d: any, newFeatures: any): any;
export declare function isInverted(dimension: string): boolean;
export declare function createToolTipForValues(records: any, recKey?: string): void;
export declare function getAllPointerEventsData(event: any): any;
export declare function createTooltipForPathLine(tooltipText: string | any[], tooltipPath: {
    text: (arg0: any) => {
        (): any;
        new (): any;
        style: {
            (arg0: string, arg1: string): {
                (): any;
                new (): any;
                style: {
                    (arg0: string, arg1: string): {
                        (): any;
                        new (): any;
                        style: {
                            (arg0: string, arg1: string): void;
                            new (): any;
                        };
                    };
                    new (): any;
                };
            };
            new (): any;
        };
    };
}, event: {
    clientX: number;
    clientY: number;
}): {
    text: (arg0: any) => {
        (): any;
        new (): any;
        style: {
            (arg0: string, arg1: string): {
                (): any;
                new (): any;
                style: {
                    (arg0: string, arg1: string): {
                        (): any;
                        new (): any;
                        style: {
                            (arg0: string, arg1: string): void;
                            new (): any;
                        };
                    };
                    new (): any;
                };
            };
            new (): any;
        };
    };
};
export declare function trans(g: any): any;
export declare function position(dimension: any, dragging: any, xScales: any): any;
export declare function cleanTooltip(): void;
