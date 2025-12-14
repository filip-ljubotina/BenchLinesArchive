import { select } from 'd3-selection';
import * as icon from './icons/icons';
import * as helper from './utils';
import { isDimensionCategorical } from './helperApiFunc';
import * as api from './helperApiFunc';
import { parcoords, makeLineInactiveCanvas, makeLineActiveCanvas,currWebTech } from './globals';
import { redrawPolylines } from './parallelcoordinates';
import { v5 as uuidv5 } from 'uuid';

export function brushDown(cleanDimensionName: string, event: any, d: any,
    tooltipValues: any, window: any): void {

    const yPosBottom = Number(select('#triangle_up_' + cleanDimensionName).attr('y'));

    let yPosTop: number;
    let yPosRect: number;
    let topToAdd: number;

    if (event.y < 70) {
        yPosTop = 70;
        yPosRect = 80;
        topToAdd = 80;
    }
    else if (event.y > yPosBottom - 10) {
        yPosTop = yPosBottom - 10;
        topToAdd = yPosBottom - 10;
        yPosRect = 320;
    }
    else if (event.y == yPosBottom - 10) {
        yPosTop = yPosBottom - 10;
        topToAdd = yPosBottom - 10;
        yPosRect = yPosTop + 10;
    }
    else {
        yPosTop = event.y;
        topToAdd = event.y;
        yPosRect = event.y + 10;
    }

    addPosition(yPosRect, d.name, 'top');

    if (yPosTop == 70 && yPosBottom == 320) {
        select('#rect_' + cleanDimensionName)
            .style('cursor', 'default');
    }
    else {
        select('#rect_' + cleanDimensionName)
            .style('cursor', `url('data:image/svg+xml,${helper.setSize(encodeURIComponent(icon.getArrowTopAndBottom()), 20)}') 8 8, auto`);
    }

    if (yPosTop == 70) {
         select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(242, 242, 76)')
            .attr('opacity', '0.5');
    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(255, 255, 0)')
            .attr('opacity', '0.7');
    }

    select('#triangle_down_' + cleanDimensionName).attr('y', yPosTop);
    select('#triangle_down_hit' + cleanDimensionName).attr('y', yPosTop);

    const heightTopRect = yPosRect - 80;
    const heightBottomRect = 320 - yPosBottom;

    select('#rect_' + cleanDimensionName)
        .attr('y', yPosRect)
        .attr('height', 240 - heightTopRect - heightBottomRect);

    if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
        setToolTipBrush(tooltipValues, d, event, window, true);
    }

    if(currWebTech === "SVG-DOM") {
        updateLines(d.name, cleanDimensionName);
    } else {
        updateCanvasLines(d.name, cleanDimensionName);
    }
}

export function brushUp(cleanDimensionName: any, event: any, d: any,
    tooltipValues: any, window: any): void {

    const yPosTop = Number(select('#triangle_down_' + cleanDimensionName).attr('y'));

    let yPosBottom: number;

    if (event.y < yPosTop + 10) {
        yPosBottom = yPosTop + 10;
    }
    else if (event.y > 320) {
        yPosBottom = 320;
    }
    else if (event.y == yPosTop + 10) {
        yPosBottom = yPosTop;
    }
    else {
        yPosBottom = event.y;
    }

    addPosition(yPosBottom, d.name, 'bottom');

    if (yPosTop == 70 && yPosBottom == 320) {
        select('#rect_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active')
            .style('cursor', 'default');
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(234, 234, 40)')
            .attr('opacity', '0.5');
    }
    else {
        select('#rect_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active')
            .style('cursor', `url('data:image/svg+xml,${helper.setSize(encodeURIComponent(icon.getArrowTopAndBottom()), 20)}') 8 8, auto`);
        select('#rect_' + cleanDimensionName)
            .attr('fill', 'rgb(255, 255, 0)')
            .attr('opacity', '0.7');
    }

    if (yPosBottom == 320) {
         select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }

    select('#triangle_up_' + cleanDimensionName).attr('y', yPosBottom);
    select('#triangle_up_hit' + cleanDimensionName).attr('y', yPosBottom);

    const heightTopRect = yPosTop - 70;
    const heightBottomRect = 320 - yPosBottom;

    select('#rect_' + cleanDimensionName)
        .attr('height', 240 - heightTopRect - heightBottomRect);

    if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
        setToolTipBrush(tooltipValues, d, event, window, false);
    }

    if(currWebTech === "SVG-DOM") {
        updateLines(d.name, cleanDimensionName);
    } else {
        updateCanvasLines(d.name, cleanDimensionName);
    }
}

export function dragAndBrush(cleanDimensionName: any, d: any, event: any,
    delta: any, tooltipValuesTop: any, tooltipValuesDown: any, window: any): 
    void {

    let yPosTop: number;
    let yPosRect: number;
    let topToAdd: number;

    const yPosBottom = select('#triangle_up_' + cleanDimensionName).attr('y');
    const yPosTopNew = select('#triangle_down_' + cleanDimensionName).attr('y');

    const heightTopRect = yPosTopNew - 70;
    const heightBottomRect = 320 - yPosBottom;

    const rectHeight = 240 - heightTopRect - heightBottomRect;

    if (event.y + delta - 10 <= 70) {
        yPosTop = 70;
        topToAdd = 80;
        yPosRect = 80;
    }
    else if (event.y + delta + rectHeight >= 320) {
        yPosTop = 320 - rectHeight - 10;
        topToAdd = 320 - rectHeight - 10;
        yPosRect = 320 - rectHeight;
    }
    else {
        yPosTop = event.y + delta - 10;
        topToAdd = event.y + delta - 10;
        yPosRect = yPosTop + 10;
    }

    addPosition(yPosRect, d.name, 'top');
    addPosition(yPosRect + rectHeight, d.name, 'bottom');

    if (yPosTop == 70) {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');
    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
    }

    if (yPosBottom == 320) {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }

    if (rectHeight < 240) {
        select('#rect_' + cleanDimensionName)
            .attr('y', yPosRect);
        select('#triangle_down_' + cleanDimensionName)
            .attr('y', yPosTop);
        select('#triangle_up_' + cleanDimensionName)
            .attr('y', yPosRect + rectHeight);
        select('#triangle_up_hit' + cleanDimensionName)
            .attr('y', yPosRect + rectHeight);
        select('#triangle_down_hit' + cleanDimensionName)
            .attr('y', yPosTop);

        if (!isNaN(parcoords.yScales[d.name].domain()[0])) {
            setToolTipDragAndBrush(tooltipValuesTop, tooltipValuesDown, d, window, true, yPosTop, yPosRect + rectHeight);
        }
        if(currWebTech === "SVG-DOM") {
            updateLines(d.name, cleanDimensionName);
        } else {
            updateCanvasLines(d.name, cleanDimensionName);
        }
    }
}

export function filter(dimensionName: string, min: number, max: number): void {

    const cleanDimensionName = helper.cleanString(dimensionName);
    const invertStatus = getInvertStatus(dimensionName);
    const yScale = parcoords.yScales[dimensionName];

    let topPosition = yScale(min);
    let bottomPosition = yScale(max);

    if (invertStatus) {
        [topPosition, bottomPosition] = [bottomPosition, topPosition];
    }
    const rectY = Math.min(topPosition, bottomPosition);
    const rectHeight = Math.abs(bottomPosition - topPosition);

    addPosition(topPosition, dimensionName, 'top');
    addPosition(bottomPosition, dimensionName, 'bottom');

    select('#rect_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY)
        .attr('height', rectHeight)
        .style('opacity', 0.3);

    select('#triangle_down_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY - 10);

    select('#triangle_down_hit' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY - 10);

    select('#triangle_up_' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY + rectHeight);

    select('#triangle_up_hit' + cleanDimensionName)
        .transition()
        .duration(1000)
        .attr('y', rectY + rectHeight);

    if (topPosition == 80) {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom');

    }
    else {
        select('#triangle_down_' + cleanDimensionName)
            .attr('href', '#brush_image_bottom_active');
    }

    if (bottomPosition == 320) {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top');
    }
    else {
        select('#triangle_up_' + cleanDimensionName)
            .attr('href', '#brush_image_top_active');
    }

    let active = select('g.active').selectAll('path');

    const rectTop = Math.min(topPosition, bottomPosition);
    const rectBottom = Math.max(topPosition, bottomPosition);

    if (isDimensionCategorical(dimensionName)) {
        const selectedCategories = yScale.domain().filter((cat: any) => {
            const pos = yScale(cat)!;
            return pos >= rectTop && pos <= rectBottom;
        });
        addRange(selectedCategories, parcoords.currentPosOfDims, dimensionName, "currentFilterCategories");
    }
    else {
        addRange(yScale.invert(rectBottom), parcoords.currentPosOfDims, dimensionName, "currentFilterBottom");
        addRange(yScale.invert(rectTop), parcoords.currentPosOfDims, dimensionName, "currentFilterTop");
    }

    active.each(function (d: { [x: string]: any; }) {
        const value = yScale(d[dimensionName]);

        const currentLine = getLineName(d);
        const dimNameToCheck = select('.' + currentLine).text();

        const emptyString = '';
        if (value < rectTop || value > rectBottom) {
            if (dimNameToCheck === emptyString) {
                makeInactive(currentLine, dimensionName, 1000);
            }
        }
        else if (dimNameToCheck === dimensionName && dimNameToCheck !== emptyString) {
            let checkedLines: string[] = [];
            parcoords.currentPosOfDims.forEach(function (item: { top: any; bottom: any; }) {
                if (item.top != yScale.range()[1] || item.bottom != yScale.range()[0]) {
                    checkAllPositionsTop(item, dimensionName, d, checkedLines, currentLine);
                    checkAllPositionsBottom(item, dimensionName, d, checkedLines, currentLine);
                }
            });
            if (!checkedLines.includes(currentLine)) {
                makeActive(currentLine, 1000);
            }
        }
    });
}

export function filterWithCoords(topPosition: number, bottomPosition: number,
    dimension: string) {
    addPosition(topPosition, dimension, 'top');
    addPosition(bottomPosition, dimension, 'bottom');

    const cleanDimensionName = helper.cleanString(dimension);

    let rectHeight = bottomPosition - topPosition;

    select('#rect_' + cleanDimensionName)
        .attr('y', topPosition);
    select('#triangle_down_' + cleanDimensionName)
        .attr('y', topPosition - 10);
    select('#triangle_up_' + cleanDimensionName)
        .attr('y', bottomPosition);
    select('#rect_' + cleanDimensionName)
        .attr('height', rectHeight);


    const invertStatus = getInvertStatus(dimension);
    const maxValue = invertStatus == false ? parcoords.yScales[dimension].domain()[1] : parcoords.yScales[dimension].domain()[0];

    const minValue = invertStatus == false ? parcoords.yScales[dimension].domain()[0] : parcoords.yScales[dimension].domain()[1];

    const range = maxValue - minValue;

    let active = select('g.active').selectAll('path');
    const emptyString = '';
    active.each(function (d: { [x: string]: number; }) {
        const currentLine = getLineName(d);
        const dimNameToCheck = select('.' + currentLine).text();

        let value: any;
        if (invertStatus) {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (d[dimension] - minValue) + 80;
        }
        else {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (maxValue - d[dimension]) + 80;
        }

        if (value < topPosition || value > bottomPosition) {
            makeInactive(currentLine, dimension, 1000);
        }
        else if (dimNameToCheck == dimension && dimNameToCheck != emptyString) {
            let checkedLines = [];
            parcoords.currentPosOfDims.forEach(function (item: any) {
                checkAllPositionsTop(item, dimension, d, checkedLines, currentLine);
                checkAllPositionsBottom(item, dimension, d, checkedLines, currentLine);

            });
            if (!checkedLines.includes(currentLine)) {
                makeActive(currentLine, 1000);
            }
        }
    });
}


export function getLineName(d: any): string {
    const keys = Object.keys(d);
    const key = keys[0];
    return helper.cleanString(d[key]);
}

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // or generate your own

export function getLineNameCanvas(d: any): string {
    const keys = Object.keys(d);
    const key = keys[0];
    const baseName = helper.cleanString(d[key]);
    const id = uuidv5(JSON.stringify(d, Object.keys(d).sort()), NAMESPACE);
    return `${baseName}-${id}`;
}

export function addPosition(yPosTop: number, dimension: string, key: string): void {
    let newObject = {};
    newObject[key] = yPosTop;
    const target = parcoords.currentPosOfDims.find((obj: { key: any; }) => obj.key == dimension);
    Object.assign(target, newObject);
}

function setToolTipBrush(tooltipValues: any, d: any, event: any, window: any, 
    direction: any): void {

    const range = parcoords.yScales[d.name].domain();
    const invertStatus = getInvertStatus(d.name);
    const maxValue = invertStatus == false ? range[1] : range[0];
    const minValue = invertStatus == false ? range[0] : range[1];

    const scale = maxValue - minValue;

    let tooltipValue: any;
    if (invertStatus) {
        tooltipValue = direction == true ? ((event.y - 70) / (240 / (scale)) + minValue) :
            ((event.y - 80) / (240 / (scale)) + minValue);
    }
    else {
        tooltipValue = direction == true ? maxValue - ((event.y - 70) / (240 / (scale))) :
            maxValue - ((event.y - 80) / (240 / (scale)));
    }

    if (!invertStatus) {
        if (tooltipValue > range[1]) {
            tooltipValue = range[1];
        }
        if (tooltipValue < range[0]) {
            tooltipValue = range[0];
        }
    }
    else {
        if (tooltipValue > range[0]) {
            tooltipValue = range[0];
        }
        if (tooltipValue < range[1]) {
            tooltipValue = range[1];
        }
    }

    const digs = getSigDig(d.name);
    tooltipValues.text(Math.round(tooltipValue.toPrecision(digs).toLocaleString('en-GB') * 10) / 10);
    tooltipValues.style('visibility', 'visible');
    tooltipValues.style('top', window.event.pageY + 'px').style('left', window.event.pageX + 'px');
    tooltipValues.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
        .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
        .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
        .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
}

function setToolTipDragAndBrush(tooltipValuesTop: any, tooltipValuesDown: any,
    d: any, window: any, direction: any, yPosTop: number,
    yPosBottom: number): void {

    const range = parcoords.yScales[d.name].domain();
    const invertStatus = getInvertStatus(d.name);
    const maxValue = invertStatus == false ? range[1] : range[0];
    const minValue = invertStatus == false ? range[0] : range[1];

    const scale = maxValue - minValue;

    let tooltipValueTop: any;
    let tooltipValueBottom: any;
    if (invertStatus) {
        tooltipValueTop = direction == true ? ((yPosTop - 70) / (240 / (scale)) + minValue) :
            ((yPosTop - 80) / (240 / (scale)) + minValue);
        tooltipValueBottom = direction == true ? ((yPosBottom - 80) / (240 / (scale)) + minValue) :
            ((yPosBottom - 70) / (240 / (scale)) + minValue);
    }
    else {
        tooltipValueTop = direction == true ? maxValue - ((yPosTop - 70) / (240 / (scale))) :
            maxValue - ((yPosTop - 80) / (240 / (scale)));
        tooltipValueBottom = direction == true ? maxValue - ((yPosBottom - 80) / (240 / (scale))) :
            maxValue - ((yPosBottom - 70) / (240 / (scale)));
    }

    if ((!invertStatus && tooltipValueTop == maxValue) || (invertStatus && tooltipValueTop == minValue)) {
        tooltipValuesTop.style('visibility', 'hidden');
    }
    else {
        tooltipValuesTop.text(Math.round(tooltipValueTop));
        tooltipValuesTop.style('visibility', 'visible');
        tooltipValuesTop.style('top', Number(yPosTop + 180) + 'px').style('left', window.event.pageX + 'px');
        tooltipValuesTop.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
            .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
            .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
            .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
    }

    if ((!invertStatus && tooltipValueBottom == minValue) || (invertStatus && tooltipValueBottom == maxValue)) {
        tooltipValuesDown.style('visibility', 'hidden');
    }
    else {
        tooltipValuesDown.text(Math.round(tooltipValueBottom));
        tooltipValuesDown.style('visibility', 'visible');
        tooltipValuesDown.style('top', Number(yPosBottom + 180) + 'px').style('left', window.event.pageX + 'px');
        tooltipValuesDown.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
            .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
            .style('padding', 0.12 + 'rem').style('white-space', 'pre-line')
            .style('background-color', 'LightGray').style('margin-left', 0.5 + 'rem');
    }
}

function updateLines(dimension: string, cleanDimensionName: string): void {

    const rangeTop = Number(select('#triangle_down_' + cleanDimensionName).attr('y'));
    const rangeBottom = Number(select('#triangle_up_' + cleanDimensionName).attr('y'));

    const invertStatus = getInvertStatus(dimension);
    const maxValue = invertStatus == false ? parcoords.yScales[dimension].domain()[1] : parcoords.yScales[dimension].domain()[0];

    const minValue = invertStatus == false ? parcoords.yScales[dimension].domain()[0] : parcoords.yScales[dimension].domain()[1];

    const range = maxValue - minValue;

    let currentFilters = api.getFilter(dimension);

    if (isDimensionCategorical(dimension)) {
        const selectedCategories = parcoords.yScales[dimension].domain().filter((cat: any) => {
            const pos = parcoords.yScales[dimension](cat)!;
            return pos >= rangeTop && pos <= rangeBottom;
        });
        addRange(selectedCategories, parcoords.currentPosOfDims, dimension, "currentFilterCategories");
    }
    else {
        addRange(currentFilters[0], parcoords.currentPosOfDims, dimension, "currentFilterBottom");
        addRange(currentFilters[1], parcoords.currentPosOfDims, dimension, "currentFilterTop");
    }

    let active = select('g.active').selectAll('path');

    active.each(function (d: { [x: string]: number; }) {
        let value: any;
        if (invertStatus) {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (d[dimension] - minValue) + 80;
        }
        else {
            value = isNaN(maxValue) ? parcoords.yScales[dimension](d[dimension]) :
                240 / range * (maxValue - d[dimension]) + 80;
        }

        const currentLine = getLineName(d);
        const dimNameToCheck = select('.' + currentLine).text();

        const emptyString = '';

        if (value < rangeTop + 10 || value > rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (value == 320 && value == rangeTop + 10 && value == rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (value == 80 && value == rangeTop + 10 && value == rangeBottom) {
            if (dimNameToCheck == emptyString) {
                makeInactive(currentLine, dimension, 100);
            }
        }
        else if (dimNameToCheck == dimension && dimNameToCheck != emptyString) {
            let checkedLines = [];
            parcoords.currentPosOfDims.forEach(function (item: { top: number; bottom: number; }) {
                if (item.top != 80 || item.bottom != 320) {
                    checkAllPositionsTop(item, dimension, d,
                        checkedLines, currentLine);
                    checkAllPositionsBottom(item, dimension, d,
                        checkedLines, currentLine);
                }
            });
            if (!checkedLines.includes(currentLine)) {
                makeActive(currentLine, 300);
            }
        }
        else {
            // do nothing
        }
    });
}

export function updateCanvasLines(
  dimension: string,
  cleanDimensionName: string,
): void {
  const rangeTop = Number(
    select("#triangle_down_" + cleanDimensionName).attr("y")
  );
  const rangeBottom = Number(
    select("#triangle_up_" + cleanDimensionName).attr("y")
  );

  const invertStatus = getInvertStatus(dimension);
  const domain = parcoords.yScales[dimension].domain();
  const maxValue = !invertStatus ? domain[1] : domain[0];
  const minValue = !invertStatus ? domain[0] : domain[1];
  const range = maxValue - minValue;

  const currentFilters = api.getFilter(dimension);

  if (isDimensionCategorical(dimension)) {
    const selectedCategories = parcoords
      .yScales[dimension]
      .domain()
      .filter((cat: any) => {
        const pos = parcoords.yScales[dimension](cat)!;
        return pos >= rangeTop && pos <= rangeBottom;
      });

    addRange(
      selectedCategories,
      parcoords.currentPosOfDims,
      dimension,
      "currentFilterCategories"
    );
  } else {
    addRange(
      currentFilters[0],
      parcoords.currentPosOfDims,
      dimension,
      "currentFilterBottom"
    );
    addRange(
      currentFilters[1],
      parcoords.currentPosOfDims,
      dimension,
      "currentFilterTop"
    );
  }

  for (const row of parcoords.newDataset) {
    const currentLineName = getLineNameCanvas(row); 

    let valueY: number;

    if (isDimensionCategorical(dimension)) {
      const cat = row[dimension];
      valueY = parcoords.yScales[dimension](cat)!;
    } else {
      const v = Number(row[dimension]);

      if (isNaN(maxValue as any)) {
        valueY = parcoords.yScales[dimension](v);
      } else if (invertStatus) {
        valueY = (240 / range) * (v - minValue) + 80;
      } else {
        valueY = (240 / range) * (maxValue - v) + 80;
      }
    }

    const mainInside =
      valueY >= rangeTop + 10 && valueY <= rangeBottom;

    const specialAllRange320 =
      valueY === 320 && valueY === rangeTop + 10 && valueY === rangeBottom;

    const specialAllRange80 =
      valueY === 80 && valueY === rangeTop + 10 && valueY === rangeBottom;

    if (!mainInside || specialAllRange320 || specialAllRange80) {
      makeLineInactiveCanvas(currentLineName);
    } else {
      makeLineActiveCanvas(currentLineName);
    }
  }

  redrawPolylines(parcoords.newDataset, parcoords);
}

function addRange(value: number, dims: any[], dimension: string, property: string): void {
    const dimSettings = dims.find(d => d.key === dimension);
    if (!dimSettings) return;

    const yScale = parcoords.yScales[dimension];
    const domain = yScale.domain();

    if (typeof domain[0] === "number") {
        dimSettings.type = "numeric";
        if (property === "currentFilterTop" || property === "currentFilterBottom") {
            dimSettings[property] = value;
        }
    } 
    else {
        dimSettings.type = "categorical";
        if (property === "currentFilterCategories") {
            dimSettings.currentFilterCategories = value;
        }
    }
}


function checkAllPositionsTop(positionItem: any, dimension: any, d: any, 
    checkedLines: any[], currentLine: any): void {

    if (positionItem.key != dimension && positionItem.top != 70) {

        const invertStatus = getInvertStatus(positionItem.key);
        const maxValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[1] :
            parcoords.yScales[positionItem.key].domain()[0];

        const minValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[0] :
            parcoords.yScales[positionItem.key].domain()[1];

        const scale = maxValue - minValue;

        let value: any;
        if (!isNaN(maxValue)) {
            value = invertStatus == false ? 240 / scale * (maxValue - d[positionItem.key]) + 80 :
                240 / scale * (d[positionItem.key] - minValue) + 80;
        }
        else {
            value = parcoords.yScales[positionItem.key](d[positionItem.key])
        }

        if (value < positionItem.top) {
            checkedLines.push(currentLine);
            select('.' + currentLine).text(positionItem.key);
        }
        else {
            //makeActive(currentLine);
        }
    }
}

function checkAllPositionsBottom(positionItem: any, dimension: string, d: any, 
    checkedLines: any[], currentLine: any): void {

    if (positionItem.key != dimension && positionItem.bottom != 320) {

        const invertStatus = getInvertStatus(positionItem.key);
        const maxValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[1] :
            parcoords.yScales[positionItem.key].domain()[0];

        const minValue = invertStatus == false ? parcoords.yScales[positionItem.key].domain()[0] :
            parcoords.yScales[positionItem.key].domain()[1];

        const scale = maxValue - minValue;

        let value: any;
        if (!isNaN(maxValue)) {
            value = invertStatus == false ? 240 / scale * (maxValue - d[positionItem.key]) + 80 :
                240 / scale * (d[positionItem.key] - minValue) + 80;
        }
        else {
            value = parcoords.yScales[positionItem.key](d[positionItem.key])
        }

        if (value >= positionItem.bottom) {
            checkedLines.push(currentLine);
            select('.' + currentLine).text(positionItem.key);
        }
        else {
            //makeActive(currentLine);
        }
    }
}

function makeActive(currentLineName: string, duration: number): void {
    if (select('.' + currentLineName).classed('selected')) {
        select('.' + currentLineName)
            .style('pointer-events', 'stroke')
            .text('')
            .transition()
            .duration(duration)
            .style('stroke', 'rgba(255, 165, 0, 1)');
    }
    else {
        select('.' + currentLineName)
            .style('pointer-events', 'stroke')
            .text('')
            .transition()
            .duration(duration)
            .style('stroke', 'rgba(0, 129, 175, 0.5)');
    }
}

function makeInactive(currentLineName: string, dimension: string, duration: number): void {
    const line = select('.' + currentLineName);

    line
        .text(dimension)
        .transition()
        .duration(duration)
        .style('stroke', 'rgba(211, 211, 211, 0.4')
        .on('end', function () {
            select(this).style('pointer-events', 'none');
        });
}

export function addSettingsForBrushing(dimension: string,
    invertStatus: boolean): void {
    const processedName = helper.cleanString(dimension);
    const yScale = parcoords.yScales[processedName];

    const dimensionSettings = parcoords.currentPosOfDims.find((d: { key: string; }) => d.key === dimension);
    let top: number, bottom: number;
    if (isDimensionCategorical(dimension)) {
        const domain = yScale.domain();
        const sorted = domain.slice().sort((a: any, b: any) => yScale(a) - yScale(b));
        const topCategory = sorted[0];
        const bottomCategory = sorted[sorted.length - 1];
        top = yScale(topCategory);
        bottom = yScale(bottomCategory);
    }
    else {
        top = yScale(dimensionSettings.currentFilterTop);
        bottom = yScale(dimensionSettings.currentFilterBottom);
    }
    
    if (invertStatus) {
        [top, bottom] = [bottom, top];
    }

    const rectY = Math.min(top, bottom);
    const rectH = Math.abs(bottom - top);

    const rect = select('#rect_' + processedName);
    const triDown = select('#triangle_down_' + processedName);
    const triUp = select('#triangle_up_' + processedName);

    rect.transition()
        .duration(300)
        .attr('y', rectY)
        .attr('height', rectH)
        .style('opacity', 0.3);

    triDown.transition()
        .duration(300)
        .attr('y', rectY - 10);

    triUp.transition()
        .duration(300)
        .attr('y', rectY + rectH);

    addPosition(top, dimension, 'top');
    addPosition(bottom, dimension, 'bottom');
}

function getInvertStatus(key: any): boolean {
    const item = parcoords.currentPosOfDims.find((object: { key: any; }) => object.key == key);
    return item.isInverted;
}

function getSigDig(key: any): number {
    const item = parcoords.currentPosOfDims.find((object: { key: any; }) => object.key == key);
    return item.sigDig;
}

export function addInvertStatus(status: any, dimensionName: any, key: any): void {
    let newObject = {};
    newObject[key] = status;
    const target = parcoords.currentPosOfDims.find((obj: { key: any; }) => obj.key == dimensionName);
    Object.assign(target, newObject);
}

const delay = 50;
export const throttleBrushDown = helper.throttle(brushDown, delay);
export const throttleBrushUp = helper.throttle(brushUp, delay);
export const throttleDragAndBrush = helper.throttle(dragAndBrush, delay);